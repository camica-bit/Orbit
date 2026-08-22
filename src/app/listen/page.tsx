"use client";
import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import VoiceCore from "@/components/listen/VoiceCore";
import TranscriptionBox from "@/components/listen/TranscriptionBox";
import AudioBars from "@/components/listen/AudioBars";
import { clientTimeZone } from "@/lib/time";
import { notifyTasksChanged } from "@/lib/taskEvents";
import styles from "./page.module.css";

type ListenState = "idle" | "listening" | "processing";

/**
 * The slice of the Web Speech API this page uses. It is not in `lib.dom.d.ts`,
 * which is why every handler here used to be typed `any`.
 */
type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((e: { results: ArrayLike<SpeechResult> }) => void) | null;
  onspeechend: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}

function speechRecognitionCtor(): (new () => SpeechRecognitionLike) | undefined {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

// Nothing to subscribe to — API support never changes for a loaded document.
const noSubscribe = () => () => {};

export default function ListenPage() {
  const router = useRouter();
  /**
   * Browser-only value. `useSyncExternalStore` is React's own way to read one
   * without a hydration mismatch or a setState inside an effect; the server
   * snapshot assumes support so the mic UI isn't hidden mid-hydration.
   */
  const speechSupported = useSyncExternalStore(
    noSubscribe,
    () => speechRecognitionCtor() !== undefined,
    () => true
  );

  const [listenState, setListenState] = useState<ListenState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  // Mirrors `transcript` so a new recognition run can append to what was
  // already captured without rebuilding its handlers on every keystroke.
  const transcriptRef = useRef("");

  const commitTranscript = useCallback((text: string) => {
    transcriptRef.current = text;
    setTranscript(text);
  }, []);

  /** Release the microphone. Declared before the cleanup effect that uses it. */
  const stopCapture = useCallback(() => {
    // Only `stopAudioAnalysis` used to run here, so `SpeechRecognition` kept
    // its own capture alive — the mic stayed hot after navigating away.
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    cancelAnimationFrame(animFrameRef.current);
    // Closing an already-closed context rejects; nothing to recover from.
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setAudioLevel(0);
  }, []);

  useEffect(() => stopCapture, [stopCapture]);

  const startAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 32;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = ctx;

      // Hoisted out of `tick` — this used to allocate 60 arrays a second.
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(avg / 128); // 0..1
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Mic permission denied — recognition reports its own error separately.
    }
  }, []);

  const startListening = useCallback(() => {
    const Ctor = speechRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    // Anything already captured is the base this run appends to. Restarting
    // the mic used to call setTranscript("") and erase the previous dictation.
    const base = transcriptRef.current;

    rec.onstart = () => {
      setError(null);
      setListenState("listening");
      startAudioAnalysis();
    };

    rec.onresult = (event) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) final += res[0].transcript + " ";
        else interim += res[0].transcript;
      }
      if (final) commitTranscript(`${base ? `${base} ` : ""}${final.trim()}`);
      setInterimText(interim);
    };

    rec.onspeechend = () => setInterimText("");

    rec.onend = () => {
      setListenState((prev) => (prev === "listening" ? "idle" : prev));
      stopCapture();
      setInterimText("");
    };

    rec.onerror = (e) => {
      stopCapture();
      setListenState("idle");
      setInterimText("");
      // "no-speech" and "aborted" are ordinary end-of-dictation outcomes.
      if (e.error !== "no-speech" && e.error !== "aborted") {
        setError(
          e.error === "not-allowed"
            ? "Microphone access was denied. You can type instead."
            : `Speech recognition failed (${e.error}). You can type instead.`
        );
      }
    };

    recognitionRef.current = rec;
    setInterimText("");
    rec.start();
  }, [startAudioAnalysis, commitTranscript, stopCapture]);

  const stopListening = useCallback(() => {
    stopCapture();
    setListenState("idle");
  }, [stopCapture]);

  const handleToggle = useCallback(() => {
    if (listenState === "listening") stopListening();
    else if (listenState === "idle") startListening();
  }, [listenState, startListening, stopListening]);

  const handleDone = async () => {
    stopCapture();
    const text = transcript.trim();
    if (!text) return;
    setListenState("processing");
    setError(null);
    try {
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Without the zone the server files tasks against its own calendar day.
        body: JSON.stringify({ text, timeZone: clientTimeZone() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Extraction failed (${res.status}).`);
      }
    } catch (e) {
      // This used to navigate home regardless, discarding the transcript with
      // no message — the recording is unrecoverable once the page unmounts.
      setError(e instanceof Error ? e.message : "Could not reach Orbit.");
      setListenState("idle");
      return;
    }
    notifyTasksChanged();
    router.push("/");
  };

  // Space toggles the mic, Escape leaves.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Space belongs to the field while the user is editing the transcript.
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        handleToggle();
      }
      if (e.code === "Escape") router.push("/");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleToggle, router]);

  const isListening = listenState === "listening";
  const isProcessing = listenState === "processing";

  return (
    <div className={styles.page}>
      {/* Scan-line overlay */}
      <div className={styles.scanline} aria-hidden="true" />

      <main className={styles.main}>
        {!speechSupported && (
          <div className={`pixel-border ${styles.unsupported}`}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 32, color: "var(--error)" }}
              aria-hidden="true"
            >
              mic_off
            </span>
            <div>
              <p className={`${styles.unsupportedTitle} font-headline-md`}>Voice Not Supported</p>
              {/* Used to say "use the text input below", which AppShell hides on
                  this route. The box below is now editable, so this is true. */}
              <p className={`${styles.unsupportedSub} font-body-md`}>
                Use Chrome or Edge for Web Speech API support — or type into the box
                below and press DONE.
              </p>
            </div>
          </div>
        )}

        {speechSupported && (
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
              aria-pressed={isListening}
              onKeyDown={(e) => e.key === "Enter" && handleToggle()}
            >
              <VoiceCore isListening={isListening} audioLevel={audioLevel} />
              <p
                className={`${styles.tapHint} font-label-mono ${
                  isListening ? styles.tapHintActive : ""
                }`}
              >
                {isProcessing
                  ? "Processing..."
                  : isListening
                  ? "Tap to stop · SPACE"
                  : "Tap to speak · SPACE"}
              </p>
            </div>

            {/* Audio bars */}
            <AudioBars isListening={isListening} audioLevel={audioLevel} />
          </>
        )}

        {/* Editable whenever the mic is off, so a misheard word can be corrected
            — and so a browser with no Speech API can still enter something. */}
        <TranscriptionBox
          text={transcript}
          interimText={interimText}
          isListening={isListening}
          onTextChange={isProcessing ? undefined : commitTranscript}
        />

        {error && (
          <div className={`pixel-border ${styles.error}`} role="alert">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, color: "var(--error)" }}
              aria-hidden="true"
            >
              error
            </span>
            <span className="font-body-md">{error}</span>
          </div>
        )}

        {/* DONE button */}
        <button
          id="listen-done-btn"
          className={`pixel-btn pixel-btn-primary ${styles.doneBtn}`}
          onClick={handleDone}
          disabled={!transcript.trim() || isProcessing}
        >
          {isProcessing ? (
            <>
              <span
                className="material-symbols-outlined anim-orbit-pulse"
                style={{ fontSize: 20 }}
                aria-hidden="true"
              >
                sync
              </span>
              PROCESSING...
            </>
          ) : (
            <>
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1", fontSize: 20 }}
                aria-hidden="true"
              >
                check_circle
              </span>
              {error ? "RETRY" : "DONE"}
            </>
          )}
        </button>

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
