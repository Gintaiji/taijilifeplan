import Link from "next/link";

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

export default function MainNavigation() {
  return (
    <nav style={navStyle} aria-label="Navigation principale">
      <ul style={listStyle}>
        <li>
          <Link href="/">Accueil</Link>
        </li>
        <li>
          <Link href="/objectifs">Objectifs</Link>
        </li>
        <li>
          <Link href="/habitudes">Habitudes</Link>
        </li>
        <li>
          <Link href="/planning">Planning</Link>
        </li>
        <li>
          <Link href="/trajectoire">Correcteur de trajectoire</Link>
        </li>
      </ul>
    </nav>
  );
}
