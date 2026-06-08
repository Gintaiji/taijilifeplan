"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./MainNavigation.module.css";

const mainLinks = [
  { href: "/", label: "Accueil" },
  { href: "/habitudes", label: "Habitudes" },
  { href: "/objectifs", label: "Objectifs" },
  { href: "/planning", label: "Planning" },
];

const secondaryLinks = [
  { href: "/trajectoire", label: "Correcteur de trajectoire" },
  { href: "/bilan", label: "Bilan" },
  { href: "/parametres", label: "Parametres" },
  { href: "/connexion", label: "Connexion" },
];

const desktopLinks = [...mainLinks, ...secondaryLinks];

export default function MainNavigation() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isSecondaryPageActive = secondaryLinks.some(
    (link) => pathname === link.href,
  );

  return (
    <nav className={styles.nav} aria-label="Navigation principale">
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

      <div className={styles.mobileInner}>
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
                  onClick={() => setIsMoreOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}

          <li className={styles.mobileItem}>
            <button
              type="button"
              className={`${styles.mobileLink} ${styles.moreButton} ${
                isSecondaryPageActive ? styles.mobileActive : ""
              }`}
              aria-expanded={isMoreOpen}
              aria-controls="mobile-more-navigation"
              onClick={() => setIsMoreOpen((currentValue) => !currentValue)}
            >
              Plus
            </button>
          </li>
        </ul>

        {isMoreOpen ? (
          <div id="mobile-more-navigation" className={styles.morePanel}>
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
                  onClick={() => setIsMoreOpen(false)}
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
