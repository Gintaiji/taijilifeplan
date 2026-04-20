import HabitsTracker from "../components/HabitsTracker";

export default function HabitudesPage() {
  return (
    <main style={{ padding: "24px" }}>
      <h1>Habitudes</h1>
      <p>Ici, tu pourras suivre tes habitudes quotidiennes.</p>
      <HabitsTracker />
    </main>
  );
}
