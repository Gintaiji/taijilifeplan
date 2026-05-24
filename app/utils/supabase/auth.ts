"use client";

import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./client";

type AuthChangeCallback = (session: Session | null) => void;

function getAuthRedirectUrl() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.location.origin;
}

export async function getSupabaseSession(): Promise<Session | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export async function getSupabaseUser(): Promise<User | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user;
}

export async function signInWithEmail(email: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) {
    throw error;
  }
}

export async function signOutFromSupabase() {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export function onSupabaseAuthChange(callback: AuthChangeCallback) {
  const supabase = getSupabaseBrowserClient();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
