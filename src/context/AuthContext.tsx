"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function getUserDisplayName(user: User | null | undefined): string {
  if (!user) return "Pilot";

  const meta = user.user_metadata;
  if (meta) {
    // 1. Explicit full_name or name from Google OAuth or signup
    if (meta.full_name && typeof meta.full_name === "string" && meta.full_name.trim()) {
      return meta.full_name.trim();
    }
    if (meta.name && typeof meta.name === "string" && meta.name.trim()) {
      return meta.name.trim();
    }
    // 2. First name + Last name combinations (handles OAuth given_name/family_name and manual first_name/last_name)
    const firstName = meta.first_name || meta.given_name;
    const lastName = meta.last_name || meta.family_name;
    const combined = [firstName, lastName]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .join(" ")
      .trim();
    if (combined) {
      return combined;
    }
    // 3. Just first name / given name
    if (firstName && typeof firstName === "string" && firstName.trim()) {
      return firstName.trim();
    }
  }

  // 4. Fallback to username from email
  if (user.email) {
    return user.email.split("@")[0];
  }

  return "Pilot";
}

export interface UserMetadataInput {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  displayName: string;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithPassword: (
    email: string,
    password: string,
    metadata?: UserMetadataInput
  ) => Promise<{ error: Error | null; user: User | null }>;
  signInWithOtp: (
    email: string,
    metadata?: UserMetadataInput
  ) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Check initial active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUpWithPassword = async (
    email: string,
    password: string,
    metadata?: UserMetadataInput
  ) => {
    const firstName = metadata?.firstName?.trim() || undefined;
    const lastName = metadata?.lastName?.trim() || undefined;
    const fullName =
      metadata?.fullName?.trim() ||
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      undefined;

    const dataPayload: Record<string, any> = {};
    if (firstName) dataPayload.first_name = firstName;
    if (lastName) dataPayload.last_name = lastName;
    if (fullName) {
      dataPayload.full_name = fullName;
      dataPayload.name = fullName;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: Object.keys(dataPayload).length > 0 ? dataPayload : undefined,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error as Error | null, user: data.user };
  };

  const signInWithOtp = async (
    email: string,
    metadata?: UserMetadataInput
  ) => {
    const firstName = metadata?.firstName?.trim() || undefined;
    const lastName = metadata?.lastName?.trim() || undefined;
    const fullName =
      metadata?.fullName?.trim() ||
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      undefined;

    const dataPayload: Record<string, any> = {};
    if (firstName) dataPayload.first_name = firstName;
    if (lastName) dataPayload.last_name = lastName;
    if (fullName) {
      dataPayload.full_name = fullName;
      dataPayload.name = fullName;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: Object.keys(dataPayload).length > 0 ? dataPayload : undefined,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const displayName = getUserDisplayName(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        displayName,
        signInWithPassword,
        signUpWithPassword,
        signInWithOtp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
