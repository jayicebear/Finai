import styles from './Landing.module.css'

function Landing() {
  return (
    <main className={styles.hero}>
      <p className={styles.badge}>AI PAPER TRADING FOR TRADERS</p>
      <h1 className={styles.title}>
        Train your edge.<br />
        Trade smarter with AI.
      </h1>
      <p className={styles.subtitle}>
        Build and test strategies with realistic market simulations,
        signal-driven insights, and performance analytics built for active traders.
      </p>
    </main>
  )
}

export default Landing
