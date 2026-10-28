import { Link, NavLink, Outlet } from 'react-router-dom'
import { LogOut, Plus, Search } from 'lucide-react'
import { getStudentSession, logoutStudent } from '../../services/studentRosterService.js'
import '../../auction-market.css'

export default function AuctionLayout() {
  const student = getStudentSession()
  if (!student) return <RequireStudent />

  function logout() {
    logoutStudent()
    window.location.assign('/')
  }

  return (
    <div className="market-shell">
      <header className="market-header">
        <Link className="market-brand" to="/"><span>🎓</span> InHerit</Link>
        <nav aria-label="Marketplace navigation">
          <NavLink to="/auctions" end><Search size={17} /> Browse</NavLink>
          <NavLink to="/auctions/create"><Plus size={17} /> Sell item</NavLink>
          <NavLink to="/my-listings">My listings</NavLink>
        </nav>
        <div className="market-account"><span>{student.name}</span><button onClick={logout} aria-label="Log out"><LogOut size={18} /></button></div>
      </header>
      <main><Outlet /></main>
    </div>
  )
}

function RequireStudent() {
  return <main className="market-state"><h1>Student login required</h1><p>Log in from the InHerit home page before accessing student marketplace tools.</p><Link className="market-button" to="/">Go to login</Link></main>
}
