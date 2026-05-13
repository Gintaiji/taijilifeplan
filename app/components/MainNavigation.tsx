"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navStyle = {
  borderBottom: "1px solid rgba(34, 197, 94, 0.22)",
  padding: "16px 24px",
  background:
    "linear-gradient(90deg, rgba(8, 17, 13, 0.98), rgba(15, 23, 42, 0.98))",
};

const listStyle = {
  display: "flex",
  gap: "16px",
  listStyle: "none",
  padding: 0,
  margin: 0,
  flexWrap: "wrap" as const,
};

const linkStyle = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: "8px",
  textDecoration: "none",
  color: "#d1fae5",
};

const activeLinkStyle = {
  ...linkStyle,
  backgroundColor: "rgba(20, 83, 45, 0.74)",
  color: "#f0fdf4",
  fontWeight: 600,
};

const links = [
  { href: "/", label: "Accueil" },
  { href: "/objectifs", label: "Objectifs" },
  { href: "/habitudes", label: "Habitudes" },
  { href: "/planning", label: "Planning" },
  { href: "/trajectoire", label: "Correcteur de trajectoire" },
  { href: "/bilan", label: "Bilan" },
  { href: "/parametres", label: "Paramètres" },
];

export default function MainNavigation() {
  const pathname = usePathname();

  return (
    <nav style={navStyle} aria-label="Navigation principale">
      <ul style={listStyle}>
        {links.map((link) => {
          const isActive = pathname === link.href;

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                style={isActive ? activeLinkStyle : linkStyle}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
