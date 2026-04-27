import { useState } from 'react'
import { Link } from 'react-router-dom'
import styles from './Navbar.module.css'

function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className={styles.navbar}>
      <Link to="/" className={styles.logo} onClick={() => setOpen(false)}>Apexis</Link>

      <button className={styles.hamburger} onClick={() => setOpen(o => !o)} aria-label="menu">
        <span className={open ? styles.barTop : styles.bar} />
        <span className={open ? styles.barMid : styles.bar} />
        <span className={open ? styles.barBot : styles.bar} />
      </button>

      <ul className={`${styles.menu} ${open ? styles.menuOpen : ''}`}>
        <li><Link to="/trading"    onClick={() => setOpen(false)}>Trading</Link></li>
        <li><Link to="/ai-trading" onClick={() => setOpen(false)}>AI Trading</Link></li>
        <li><Link to="/portfolio"  onClick={() => setOpen(false)}>Portfolio</Link></li>
        <li><Link to="/history"    onClick={() => setOpen(false)}>History</Link></li>
        <li><Link to="/investors"  onClick={() => setOpen(false)}>Investors</Link></li>
        <li><Link to="/algorithm"  onClick={() => setOpen(false)}>Algorithm</Link></li>
        <li><Link to="/feed"       onClick={() => setOpen(false)}>Feed</Link></li>
      </ul>

      <div className={`${styles.auth} ${open ? styles.authOpen : ''}`}>
        <button className={styles.login}>Log in</button>
        <button className={styles.signup}>Sign up</button>
      </div>
    </nav>
  )
}

export default Navbar
