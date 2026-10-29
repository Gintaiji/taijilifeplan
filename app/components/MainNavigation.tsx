"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./MainNavigation.module.css";

const mainLinks = [
  { href: "/", label: "Accueil" },
  { href: "/habitudes", label: "Habitudes" },
  { href: "/objectifs", label: "Objectifs" },
  { href: "/planning", label: "Planning" },
  { href: "/trajectoire", label: "Trajectoire" },
];

const secondaryLinks = [
  { href: "/bilan", label: "Bilan" },
  { href: "/parametres", label: "Parametres" },
  { href: "/connexion", label: "Connexion" },
];

const desktopLinks = [...mainLinks, ...secondaryLinks];

const iconPaths: Record<string, string> = {
  Accueil: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  Habitudes: "M9 5h12M9 12h12M9 19h12M3 5l1 1 2-2M3 12l1 1 2-2M3 19l1 1 2-2",
  Objectifs: "M21 12a9 9 0 1 1-9-9m5 9a5 5 0 1 1-5-5m0 5 9-9m-5 0h5v5",
  Planning: "M4 5h16v16H4ZM8 3v4m8-4v4M4 10h16M8 14h2m4 0h2m-8 4h2",
  Trajectoire: "M4 20V4m0 16h16M8 15l4-5 4 2 5-8m-5 0h5v5",
  Plus: "M5 11v2m7-2v2m7-2v2",
};

function NavigationIcon({ label }: { label: string }) {
  return (
    <svg className={styles.icon} width="22" height="22" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={iconPaths[label]} />
    </svg>
  );
}

export default function MainNavigation() {
  const pathname = usePathname();
  const [moreOpenPath, setMoreOpenPath] = useState<string | null>(null);
  const isMoreOpen = moreOpenPath === pathname;
  const navRef = useRef<HTMLElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeMore = () => setMoreOpenPath(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    // Reserve the real bar height, including safe area and enlarged text.
    const updateHeight = () => {
      document.documentElement.style.setProperty(
        "--mobile-navigation-height", `${Math.ceil(nav.getBoundingClientRect().height)}px`,
      );
    };
    const observer = new ResizeObserver(updateHeight);
    observer.observe(nav);
    updateHeight();
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--mobile-navigation-height");
    };
  }, []);

  useEffect(() => {
    if (!isMoreOpen) return;
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const handleOutside = (event: Event) => {
      if (event.target instanceof Node && !mobileRef.current?.contains(event.target)) {
        setMoreOpenPath(null);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMoreOpenPath(null);
        moreButtonRef.current?.focus();
      }
    };
    const desktopQuery = window.matchMedia("(min-width: 641px)");
    const handleDesktop = () => {
      if (desktopQuery.matches) setMoreOpenPath(null);
    };
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("focusin", handleOutside);
    document.addEventListener("keydown", handleKey);
    desktopQuery.addEventListener("change", handleDesktop);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("focusin", handleOutside);
      document.removeEventListener("keydown", handleKey);
      desktopQuery.removeEventListener("change", handleDesktop);
    };
  }, [isMoreOpen]);
  const isSecondaryPageActive = secondaryLinks.some(
    (link) => pathname === link.href,
  );

  return (
    <nav ref={navRef} className={styles.nav} aria-label="Navigation principale">
      <div className={styles.desktopInner}>
        <ul className={styles.list}>
          {desktopLinks.map((link) => {
            const isActive = pathname === link.href;

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`${styles.link} ${isActive ? styles.active : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div ref={mobileRef} className={styles.mobileInner}>
        <ul className={styles.mobileList}>
          {mainLinks.map((link) => {
            const isActive = pathname === link.href;

            return (
              <li key={link.href} className={styles.mobileItem}>
                <Link
                  href={link.href}
                  className={`${styles.mobileLink} ${
                    isActive ? styles.mobileActive : ""
                  }`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={closeMore}
                >
                  <NavigationIcon label={link.label} />
                  <span className={styles.mobileLabel}>{link.label}</span>
                </Link>
              </li>
            );
          })}

          <li className={styles.mobileItem}>
            <button
              type="button"
              ref={moreButtonRef}
              className={`${styles.mobileLink} ${styles.moreButton} ${
                isSecondaryPageActive ? styles.mobileActive : ""
              }`}
              aria-expanded={isMoreOpen}
              aria-controls="mobile-more-navigation"
              onClick={() => setMoreOpenPath(isMoreOpen ? null : pathname)}
            >
              <NavigationIcon label="Plus" />
              <span className={styles.mobileLabel}>Plus</span>
            </button>
          </li>
        </ul>

        {isMoreOpen ? (
          <div ref={panelRef} id="mobile-more-navigation" className={styles.morePanel}
            role="group" aria-label="Autres pages">
            {secondaryLinks.map((link) => {
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.moreLink} ${
                    isActive ? styles.moreLinkActive : ""
                  }`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={closeMore}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
