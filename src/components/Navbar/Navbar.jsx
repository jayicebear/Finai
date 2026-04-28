import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import styles from './Navbar.module.css'

function Navbar() {
  const [open, setOpen] = useState(false)

  const navClass = ({ isActive }) =>
    isActive ? styles.navLinkActive : styles.navLink

  return (
    <nav className={styles.navbar}>
      <Link to="/" className={styles.logo} onClick={() => setOpen(false)}>Apexis</Link>

      <button className={styles.hamburger} onClick={() => setOpen(o => !o)} aria-label="menu">
        <span className={open ? styles.barTop : styles.bar} />
        <span className={open ? styles.barMid : styles.bar} />
        <span className={open ? styles.barBot : styles.bar} />
      </button>

      <ul className={`${styles.menu} ${open ? styles.menuOpen : ''}`}>
        <li><NavLink to="/trading"    className={navClass} onClick={() => setOpen(false)}>Trading</NavLink></li>
        <li><NavLink to="/ai-trading" className={navClass} onClick={() => setOpen(false)}>AI Trading</NavLink></li>
        <li><NavLink to="/portfolio"  className={navClass} onClick={() => setOpen(false)}>Portfolio</NavLink></li>
        <li><NavLink to="/history"    className={navClass} onClick={() => setOpen(false)}>History</NavLink></li>
        <li><NavLink to="/investors"  className={navClass} onClick={() => setOpen(false)}>Investors</NavLink></li>
        <li><NavLink to="/algorithm"  className={navClass} onClick={() => setOpen(false)}>Algorithm</NavLink></li>
        <li><NavLink to="/strategy"   className={navClass} onClick={() => setOpen(false)}>Strategy</NavLink></li>
        <li><NavLink to="/feed"       className={navClass} onClick={() => setOpen(false)}>Feed</NavLink></li>
      </ul>

      <div className={`${styles.auth} ${open ? styles.authOpen : ''}`}>
        <button className={styles.login}>Log in</button>
        <button className={styles.signup}>Sign up</button>
      </div>
    </nav>
  )
}

export default Navbar
