import WeeklyReview from "../components/WeeklyReview";
import styles from "../components/WeeklyReview.module.css";

export default function BilanPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Bilan</h1>
          <p>Un regard sur tes avancées, à ton rythme.</p>
        </header>
        <WeeklyReview />
      </div>
    </main>
  );
}
