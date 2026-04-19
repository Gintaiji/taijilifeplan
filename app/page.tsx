import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h1>Taiji Life Plan</h1>
      <p>Bienvenue dans ton application de pilotage personnel.</p>

      <nav style={{ marginTop: "24px" }}>
        <ul style={{ display: "flex", gap: "16px", listStyle: "none", padding: 0, flexWrap: "wrap" }}>
          <li>
            <Link href="/">Dashboard</Link>
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
    </main>
  );
}