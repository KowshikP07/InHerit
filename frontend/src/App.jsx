import { useEffect, useState } from 'react'
import { ArrowRight, Check, Menu, ShieldCheck, X } from 'lucide-react'
import './App.css'
import { useNavigate } from 'react-router-dom'
import { loginStudent, registerStudent } from './services/studentRosterService.js'

const navItems = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Browse drops', href: '#closing-soon' },
  { label: 'Why InHerit', href: '#why-InHerit' },
]

function AuthDialog({ mode, onChangeMode, onClose, onAuthenticated }) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  function changeMode(nextMode) {
    setFormError('')
    setIsSubmitted(false)
    onChangeMode(nextMode)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? 'Student@123')

    if (mode === 'signup') {
      const email = String(form.get('email') ?? '')
      const result = await registerStudent({
        name: form.get('name'),
        rollNo: form.get('rollNo'),
        email,
        department: form.get('department'),
        year: form.get('year'),
        password,
      })
      if (!result.ok) {
        setFormError(result.message)
        return
      }
      const session = await loginStudent(email, password)
      if (!session.ok) {
        setFormError(session.message)
        return
      }
    } else {
      const email = String(form.get('email') ?? '')
      const session = await loginStudent(email, password)
      if (!session.ok) {
        setFormError(session.message)
        return
      }
    }

    setIsSubmitted(true)
  }

  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button dialog-close" type="button" onClick={onClose} aria-label="Close dialog">
          <X size={20} strokeWidth={3} />
        </button>
        <div className="auth-tabs" aria-label="Authentication options">
          <button className={mode === 'signin' ? 'active' : ''} type="button" onClick={() => changeMode('signin')}>Log in</button>
          <button className={mode === 'signup' ? 'active' : ''} type="button" onClick={() => changeMode('signup')}>Join campus</button>
        </div>
        {isSubmitted ? (
          <div className="auth-success" aria-live="polite">
            <span><Check size={28} strokeWidth={3} /></span>
            <h2 id="auth-title">{mode === 'signup' ? 'Check your campus email.' : 'You’re in.'}</h2>
            <p>{mode === 'signup' ? 'We’ll send a one-time code to verify it’s you.' : 'The InHerit sign-in flow will connect next.'}</p>
            <button className="primary-button" type="button" onClick={onAuthenticated}>Got it</button>
          </div>
        ) : (
          <>
            <p className="eyebrow">Campus only. Students only.</p>
            <h2 id="auth-title">{mode === 'signup' ? 'Meet your next owner.' : 'Back for another bid?'}</h2>
            <p className="auth-copy">
              {mode === 'signup'
                ? 'Use your campus email to start buying or selling.'
                : 'Log in to track bids, listings, and pickups.'}
            </p>
            <form onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <>
                  <label>
                    Full name
                    <input name="name" type="text" autoComplete="name" required placeholder="Alex Student" />
                  </label>
                  <div className="form-row">
                    <label>
                      Roll number
                      <input name="rollNo" type="text" required placeholder="23CSR001" />
                    </label>
                    <label>
                      Study year
                      <select name="year" required defaultValue="">
                        <option value="" disabled>Select year</option>
                        <option value="1">First year</option>
                        <option value="2">Second year</option>
                        <option value="3">Third year</option>
                        <option value="4">Fourth year</option>
                        <option value="5">Postgraduate</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    Department
                    <input name="department" type="text" required placeholder="Computer Science" />
                  </label>
                </>
              )}
              <label>
                Campus email
                <input name="email" type="email" autoComplete="email" required placeholder="you@campus.edu" />
              </label>
              <label>
                Password
                <input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={8} placeholder="8 characters minimum" />
              </label>
              {formError && <p role="alert" className="form-error">{formError}</p>}
              <button className="primary-button auth-submit" type="submit">
                {mode === 'signup' ? 'Verify my email' : 'Log in'}
                <ArrowRight size={18} strokeWidth={3} />
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}

export default function App() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [authMode, setAuthMode] = useState(null)

  function openAuth(mode) {
    setMenuOpen(false)
    setAuthMode(mode)
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="InHerit home">
          <span className="brand-mark">🎓</span>
          <span>InHerit</span>
        </a>

        <button
          className="icon-button menu-button"
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X size={23} strokeWidth={3} /> : <Menu size={23} strokeWidth={3} />}
        </button>

        <nav id="primary-navigation" className={menuOpen ? 'open' : ''} aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>
          ))}
          {/* <Link to="/auctions" onClick={() => setMenuOpen(false)}>Browse auctions</Link> */}
          <div className="mobile-auth">
            <button type="button" onClick={() => openAuth('signin')}>Log in</button>
            <button className="primary-button" type="button" onClick={() => openAuth('signup')}>Join campus</button>
          </div>
        </nav>

        <div className="desktop-auth">
          {/* <Link className="text-button" to="/auctions">Browse auctions</Link> */}
          <button className="text-button" type="button" onClick={() => openAuth('signin')}>Log in</button>
          <button className="primary-button" type="button" onClick={() => openAuth('signup')}>
            Join campus <ArrowRight size={18} strokeWidth={3} />
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <p className="eyebrow">Campus clearance, done right</p>
            <h1 id="hero-heading">PASS IT ON. <span>BID IT UP.</span></h1>
            <p className="hero-lead">
              Sell the stuff you’re leaving behind. Bid on what you need next. One campus, every offer visible, no messy group chats.
            </p>
            <div className="hero-actions">
              <button className="primary-button hero-primary" type="button" onClick={() => openAuth('signup')}>
                Start bidding <ArrowRight size={20} strokeWidth={3} />
              </button>
              <a className="secondary-link" href="#closing-soon">See live drops <span>↘</span></a>
            </div>
            <div className="trust-note"><ShieldCheck size={20} strokeWidth={3} /> Verified students only · Campus handovers</div>
          </div>

          <div className="hero-art" aria-label="A live campus auction">
            <div className="spark spark-one">★</div>
            <div className="spark spark-two">●</div>
            <article className="auction-card">
              <div className="auction-image">
                <span className="category-sticker">BOOKS</span>
                <span className="item-art" aria-hidden="true">📚</span>
              </div>
              <div className="auction-body">
                <div className="auction-meta"><span>Ending in 02:14:08</span><span>7 bids</span></div>
                <h2>Final-year book bundle</h2>
                <p>Like new · Core CS set</p>
                <div className="bid-row">
                  <div><small>CURRENT BID</small><strong>₹1,250</strong></div>
                  <button type="button" onClick={() => openAuth('signin')}>Place bid <ArrowRight size={17} strokeWidth={3} /></button>
                </div>
              </div>
            </article>
            <div className="fair-badge"><Check size={22} strokeWidth={3} /><span>Every bid<br />is public</span></div>
          </div>
        </section>

        <section id="how-it-works" className="how-section" aria-label="How InHerit works">
          <div className="section-heading">
            <p>THE FAIR WAY</p>
            <h2>Less chaos. More clarity.</h2>
          </div>
          <div className="steps">
            <article><span>01</span><h3>List it</h3><p>Add photos, set a close time, and name your starting bid.</p></article>
            <article><span>02</span><h3>Bid it</h3><p>Everyone can see the public bid history and where they stand.</p></article>
            <article><span>03</span><h3>Meet & pass it on</h3><p>Confirm the campus handover together. Then mark it sold.</p></article>
          </div>
        </section>

        <section id="closing-soon" className="closing-section" aria-labelledby="closing-heading">
          <div>
            <p className="eyebrow">Closing soon</p>
            <h2 id="closing-heading">New owner, next hour.</h2>
          </div>
          <div className="mini-auctions">
            <article><span className="mini-icon yellow">🚲</span><div><strong>City bicycle</strong><small>Closes in 47 min</small></div><b>₹3,800</b></article>
            <article><span className="mini-icon cyan">⌨️</span><div><strong>Mechanical keyboard</strong><small>Closes in 1 hr</small></div><b>₹2,100</b></article>
          </div>
        </section>
        <span id="why-InHerit" className="anchor" />
      </main>

      {authMode && (
        <AuthDialog
          mode={authMode}
          onChangeMode={setAuthMode}
          onClose={() => setAuthMode(null)}
          onAuthenticated={() => {
            setAuthMode(null)
            navigate('/auctions')
          }}
        />
      )}
    </div>
  )
}
