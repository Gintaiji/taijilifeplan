import HabitsTracker from "../components/HabitsTracker";
import styles from "./page.module.css";

export default function HabitudesPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.pageTitle}>Habitudes</h1>
        <p className={styles.intro}>
          Garde tes habitudes du jour sous les yeux, simplement.
        </p>
      </section>

      <HabitsTracker />
    </main>
  );
}
