import { Link } from 'react-router-dom'
import styles from './Navbar.module.css'

function Navbar() {
  return (
    <nav className={styles.navbar}>
      <Link to="/" className={styles.logo}>FinTrend</Link>
      <ul className={styles.menu}>
        <li><Link to="/trading">Trading</Link></li>
        <li><Link to="/ai-trading">AI Trading</Link></li>
        <li><Link to="/portfolio">Portfolio</Link></li>
        <li><Link to="/history">History</Link></li>
        <li><Link to="/investors">Investors</Link></li>
        <li><Link to="/feed">Feed</Link></li>
      </ul>
      <div className={styles.auth}>
        <button className={styles.login}>Log in</button>
        <button className={styles.signup}>Sign up</button>
      </div>
    </nav>
  )
}

export default Navbar
