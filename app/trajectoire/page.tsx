import TrajectoryReview from "../components/TrajectoryReview";

export default function TrajectoirePage() {
  return (
    <main style={{ padding: "24px" }}>
      <h1>Correcteur de trajectoire</h1>
      <p>Ici, tu pourras analyser ta journée et ajuster ta direction.</p>
      <TrajectoryReview />
    </main>
  );
}
