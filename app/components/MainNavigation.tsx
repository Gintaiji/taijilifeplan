"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navStyle = {
  borderBottom: "1px solid #e5e7eb",
  padding: "16px 24px",
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
  color: "#1f2937",
};

const activeLinkStyle = {
  ...linkStyle,
  backgroundColor: "#e5e7eb",
  fontWeight: 600,
};

const links = [
  { href: "/", label: "Accueil" },
  { href: "/objectifs", label: "Objectifs" },
  { href: "/habitudes", label: "Habitudes" },
  { href: "/planning", label: "Planning" },
  { href: "/trajectoire", label: "Correcteur de trajectoire" },
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
