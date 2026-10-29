import TrajectoryReview from "../components/TrajectoryReview";
import styles from "../components/TrajectoryReview.module.css";

export default function TrajectoirePage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Correcteur de trajectoire</h1>
        <TrajectoryReview />
      </div>
    </main>
  );
}
