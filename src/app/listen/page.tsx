"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import VoiceCore from "@/components/listen/VoiceCore";
import TranscriptionBox from "@/components/listen/TranscriptionBox";
import AudioBars from "@/components/listen/AudioBars";
import styles from "./page.module.css";

type ListenState = "idle" | "listening" | "processing" | "unsupported";

export default function ListenPage() {
  const router = useRouter();
  const [listenState, setListenState] = useState<ListenState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Check Speech API support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasAPI = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
      if (!hasAPI) setListenState("unsupported");
    }
    return () => stopAudioAnalysis();
  }, []);

  // Audio level analyser for visualizer
  const startAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 32;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const tick = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(avg / 128); // 0..1
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // mic permission denied or not available — still works visually
    }
  }, []);

  const stopAudioAnalysis = () => {
    cancelAnimationFrame(animFrameRef.current);
    audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setAudioLevel(0);
  };

  const setupRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      setListenState("listening");
      startAudioAnalysis();
    };

    rec.onresult = (event: any) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) final += res[0].transcript + " ";
        else interim += res[0].transcript;
      }
      if (final) setTranscript(final.trim());
      setInterimText(interim);
    };

    rec.onspeechend = () => setInterimText("");

    rec.onend = () => {
      setListenState((prev) => (prev === "listening" ? "idle" : prev));
      stopAudioAnalysis();
      setInterimText("");
    };

    rec.onerror = (e: any) => {
      console.error("Speech recognition error:", e.error);
      stopAudioAnalysis();
      setListenState("idle");
    };

    recognitionRef.current = rec;
    return rec;
  }, [startAudioAnalysis]);

  const startListening = useCallback(() => {
    setTranscript("");
    setInterimText("");
    const rec = setupRecognition();
    rec.start();
  }, [setupRecognition]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    stopAudioAnalysis();
    setListenState("idle");
  }, []);

  const handleToggle = () => {
    if (listenState === "listening") stopListening();
    else if (listenState === "idle") startListening();
  };

  const handleDone = () => {
    recognitionRef.current?.stop();
    stopAudioAnalysis();
    setListenState("processing");
    // TODO: wire to AI in Phase 3
    setTimeout(() => router.push("/"), 1200);
  };

  // Space key toggle, Escape = exit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space") { e.preventDefault(); handleToggle(); }
      if (e.code === "Escape") router.push("/");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [listenState, handleToggle, router]);

  const isListening = listenState === "listening";

  return (
    <div className={styles.page}>
      {/* Scan-line overlay */}
      <div className={styles.scanline} aria-hidden="true" />

      <main className={styles.main}>
        {listenState === "unsupported" ? (
          <div className={`pixel-border ${styles.unsupported}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--error)" }}>
              mic_off
            </span>
            <div>
              <p className={`${styles.unsupportedTitle} font-headline-md`}>
                Voice Not Supported
              </p>
              <p className={`${styles.unsupportedSub} font-body-md`}>
                Use Chrome or Edge for Web Speech API support. Or use the text input below.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* System telemetry bar */}
            <div className={styles.telemetryBar}>
              <span className={`${styles.telItem} font-label-mono`}>
                <span className={`${styles.telDot} ${isListening ? styles.telDotActive : ""}`} />
                {isListening ? "LISTENING" : "STANDBY"}
              </span>
              <span className={`${styles.telItem} font-label-mono`}>FREQ: 44.1kHz</span>
              <span className={`${styles.telItem} font-label-mono`}>ORBIT v1.0</span>
            </div>

            {/* Voice core */}
            <div
              className={`${styles.coreWrap} ${isListening ? styles.coreWrapActive : ""}`}
              onClick={handleToggle}
              role="button"
              tabIndex={0}
              aria-label={isListening ? "Stop listening" : "Start listening"}
              onKeyDown={(e) => e.key === "Enter" && handleToggle()}
            >
              <VoiceCore isListening={isListening} audioLevel={audioLevel} />
              <p className={`${styles.tapHint} font-label-mono ${isListening ? styles.tapHintActive : ""}`}>
                {listenState === "processing" ? "Processing..." : isListening ? "Tap to stop · SPACE" : "Tap to speak · SPACE"}
              </p>
            </div>

            {/* Audio bars */}
            <AudioBars isListening={isListening} audioLevel={audioLevel} />

            {/* Transcription box */}
            <TranscriptionBox
              text={transcript}
              interimText={interimText}
              isListening={isListening}
            />

            {/* DONE button */}
            <button
              id="listen-done-btn"
              className={`pixel-btn pixel-btn-primary ${styles.doneBtn}`}
              onClick={handleDone}
              disabled={!transcript || listenState === "processing"}
            >
              {listenState === "processing" ? (
                <>
                  <span className="material-symbols-outlined anim-orbit-pulse" style={{ fontSize: 20 }}>
                    sync
                  </span>
                  PROCESSING...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 20 }}>
                    check_circle
                  </span>
                  DONE
                </>
              )}
            </button>
          </>
        )}

        <div className={styles.keyHints}>
          <span className={`${styles.keyBadge} font-label-mono`}>SPACE</span>
          <span className="font-label-mono">{isListening ? "Stop" : "Start"}</span>
          <span className={`${styles.keyBadge} font-label-mono`}>ESC</span>
          <span className="font-label-mono">Exit</span>
        </div>
      </main>
    </div>
  );
}
