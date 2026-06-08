"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./MainNavigation.module.css";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/objectifs", label: "Objectifs" },
  { href: "/habitudes", label: "Habitudes" },
  { href: "/planning", label: "Planning" },
  { href: "/trajectoire", label: "Correcteur de trajectoire" },
  { href: "/bilan", label: "Bilan" },
  { href: "/parametres", label: "Parametres" },
  { href: "/connexion", label: "Connexion" },
];

export default function MainNavigation() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Navigation principale">
      <div className={styles.inner}>
        <ul className={styles.list}>
          {links.map((link) => {
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
    </nav>
  );
}
