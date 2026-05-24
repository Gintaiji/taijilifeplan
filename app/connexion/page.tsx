"use client";

import type { Session } from "@supabase/supabase-js";
import { FormEvent, useEffect, useState } from "react";
import {
  getSupabaseSession,
  onSupabaseAuthChange,
  signInWithPassword,
  signOutFromSupabase,
  signUpWithPassword,
} from "../utils/supabase";
import styles from "./page.module.css";

function getAuthErrorMessage() {
  return "Erreur d'identifiants. Verifie ton email et ton mot de passe.";
}

export default function ConnexionPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let shouldUpdateState = true;

    async function loadSession() {
      try {
        const currentSession = await getSupabaseSession();

        if (shouldUpdateState) {
          setSession(currentSession);
        }
      } catch {
        if (shouldUpdateState) {
          setError("Impossible de charger la session Supabase.");
        }
      } finally {
        if (shouldUpdateState) {
          setIsLoadingSession(false);
        }
      }
    }

    void loadSession();

    const unsubscribe = onSupabaseAuthChange((newSession) => {
      setSession(newSession);
    });

    return () => {
      shouldUpdateState = false;
      unsubscribe();
    };
  }, []);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      const newSession = await signInWithPassword(email, password);
      setSession(newSession);
      setMessage("Connexion reussie.");
      setPassword("");
    } catch {
      setError(getAuthErrorMessage());
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignUp() {
    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      const newSession = await signUpWithPassword(email, password);
      setSession(newSession);
      setMessage("Inscription reussie.");
      setPassword("");
    } catch {
      setError(getAuthErrorMessage());
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      await signOutFromSupabase();
      setSession(null);
      setMessage("Deconnexion reussie.");
    } catch {
      setError("Impossible de te deconnecter pour le moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const userEmail = session?.user.email;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Compte</p>
        <h1 className={styles.pageTitle}>Connexion</h1>
        <p className={styles.intro}>
          Connecte ton compte Supabase. Tes donnees restent pour l&apos;instant
          stockees localement sur cet appareil.
        </p>
      </section>

      <section className={styles.content}>
        <article className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.cardTitle}>Utilisateur</h2>
              <p className={styles.cardText}>
                La connexion prepare la future sauvegarde cloud, sans modifier
                le fonctionnement actuel de l&apos;application.
              </p>
            </div>
          </div>

          <div className={styles.sessionBox}>
            <span className={styles.statusLabel}>Session</span>
            {isLoadingSession ? (
              <strong className={styles.statusValue}>Chargement...</strong>
            ) : userEmail ? (
              <strong className={styles.statusOk}>{userEmail}</strong>
            ) : (
              <strong className={styles.statusWarning}>Non connecte</strong>
            )}
          </div>

          {userEmail ? (
            <button
              type="button"
              className={`control-button ${styles.button}`}
              onClick={handleSignOut}
              disabled={isSubmitting}
            >
              Se deconnecter
            </button>
          ) : (
            <form className={styles.form} onSubmit={handleSignIn}>
              <label className={styles.field}>
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>

              <label className={styles.field}>
                <span>Mot de passe</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  minLength={6}
                  required
                />
              </label>

              <div className={styles.actions}>
                <button
                  type="submit"
                  className={`control-button ${styles.button}`}
                  disabled={isSubmitting}
                >
                  Se connecter
                </button>

                <button
                  type="button"
                  className={`control-button ${styles.secondaryButton}`}
                  onClick={handleSignUp}
                  disabled={isSubmitting}
                >
                  Creer un compte
                </button>
              </div>
            </form>
          )}

          {message ? <p className={styles.successText}>{message}</p> : null}
          {error ? <p className={styles.errorText}>{error}</p> : null}
        </article>
      </section>
    </main>
  );
}
