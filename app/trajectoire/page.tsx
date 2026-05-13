import TrajectoryReview from "../components/TrajectoryReview";

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

export default function TrajectoirePage() {
  return (
    <main style={pageStyle}>
      <h1>Correcteur de trajectoire</h1>
      <p style={introStyle}>
        Ici, tu peux analyser ta journee et ajuster ta direction.
      </p>
      <TrajectoryReview />
    </main>
  );
}
