import WeeklyReview from "../components/WeeklyReview";

const pageStyle = {
  minHeight: "100vh",
  padding: "clamp(16px, 5vw, 24px)",
  background: "linear-gradient(180deg, #08110d 0%, #0a0a0a 100%)",
  color: "var(--dashboard-text-primary)",
};

const introStyle = {
  marginTop: "8px",
  color: "var(--dashboard-text-secondary)",
  lineHeight: 1.6,
};

export default function BilanPage() {
  return (
    <main style={pageStyle}>
      <h1>Bilan</h1>
      <p style={introStyle}>
        Regarde ta progression des derniers jours.
      </p>
      <WeeklyReview />
    </main>
  );
}
