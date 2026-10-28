import { useState } from 'react'
import { ArrowLeft, ArrowRight, KeyRound, ShieldCheck, AlertTriangle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { loginAdmin } from '../../services/studentRosterService.js'
import '../../admin-theme.css'

export default function SuperAdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function fillDemo() {
    setEmail('admin@campusbid.local')
    setPassword('Admin@123')
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const ok = await loginAdmin(email, password)
    if (ok) {
      navigate('/admin', { replace: true })
    } else {
      setError('Invalid credentials. Please verify your administrator email and password.')
    }
    setLoading(false)
  }

  return (
    <main className="admin-theme min-h-screen px-4 py-8 sm:px-8 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Neo-brutalist background decorative sparks */}
      <div className="admin-spark text-[#ffdc3d] top-6 left-8 hidden sm:block rotate-12 text-5xl">★</div>
      <div className="admin-spark text-[#62cfcc] bottom-8 right-10 hidden sm:block -rotate-6 text-4xl">●</div>

      <div className="w-full max-w-4xl relative z-10">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 font-extrabold text-sm text-[#171717] hover:translate-x-[-2px] transition-transform"
          >
            <span className="w-8 h-8 grid place-items-center border-2 border-[#171717] bg-[#ffdc3d] shadow-[3px_3px_0_#171717]">
              <ArrowLeft size={16} strokeWidth={3} />
            </span>
            <span>Back to InHerit Campus</span>
          </Link>
        </div>

        <div className="grid md:grid-cols-[1.1fr_1fr] border-[4px] border-[#171717] bg-white shadow-[12px_12px_0_#171717] overflow-hidden">
          {/* Left panel - Dark editorial neo-brutalist */}
          <section className="bg-[#171717] text-white p-8 sm:p-12 flex flex-col justify-between border-b-[4px] md:border-b-0 md:border-r-[4px] border-[#171717] relative">
            <div>
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 grid place-items-center border-2 border-[#171717] bg-[#ffdc3d] text-2xl shadow-[3px_3px_0_#ff806e] rotate-[-3deg]">
                  🎓
                </span>
                <div>
                  <span className="font-['Archivo_Black'] text-2xl tracking-tight text-white block">InHerit</span>
                  <span className="text-[11px] font-mono text-[#ffdc3d] uppercase tracking-widest">Control Center</span>
                </div>
              </div>

              <div className="mt-8">
                <span className="admin-eyebrow">Institutional Access</span>
                <h1 className="text-3xl sm:text-4xl font-['Archivo_Black'] tracking-tight leading-[0.95] mt-4">
                  SUPER ADMIN.
                  <span className="block text-[#ff806e] mt-1">FULL CONTROL.</span>
                </h1>
                <p className="mt-5 text-sm sm:text-base text-neutral-300 leading-relaxed font-medium">
                  Manage college eligibility rosters, execute bulk CSV student imports, and oversee transparent campus auctions.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t-2 border-white/20">
              <div className="flex items-center gap-3 bg-neutral-900 border-2 border-[#ffdc3d] p-3.5 shadow-[4px_4px_0_#ff806e]">
                <ShieldCheck size={22} className="text-[#ffdc3d] shrink-0" strokeWidth={2.5} />
                <span className="text-xs font-mono text-neutral-200">
                  Verified campus administrators only · 256-bit institutional clearance
                </span>
              </div>
            </div>
          </section>

          {/* Right panel - White form */}
          <section className="p-8 sm:p-12 flex flex-col justify-between bg-[#f7f3ea]">
            <div>
              <span className="admin-eyebrow cyan">Sign In</span>
              <h2 className="text-2xl sm:text-3xl font-['Archivo_Black'] text-[#171717] mt-3">
                Console Access
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1 font-medium">
                Enter your administrative credentials to continue.
              </p>

              {error && (
                <div role="alert" className="admin-alert admin-alert-error mt-5">
                  <AlertTriangle size={18} className="shrink-0 text-[#b42318]" strokeWidth={2.5} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold font-mono uppercase tracking-wider text-[#171717] mb-1.5">
                    Admin Email
                  </label>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    required
                    autoComplete="username"
                    placeholder="admin@campusbid.local"
                    className="admin-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold font-mono uppercase tracking-wider text-[#171717] mb-1.5">
                    Password
                  </label>
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="admin-input font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="admin-btn admin-btn-primary w-full mt-2 text-base py-3.5"
                >
                  <span>{loading ? 'Authenticating…' : 'Enter Dashboard'}</span>
                  <ArrowRight size={18} strokeWidth={3} />
                </button>
              </form>
            </div>

            {/* Quick Demo Access Ticket */}
            <div className="mt-8 border-2 border-[#171717] bg-[#ffdc3d] p-4 shadow-[4px_4px_0_#171717]">
              <div className="flex items-center justify-between gap-2 border-b-2 border-[#171717] pb-2 mb-2">
                <span className="font-mono text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 text-[#171717]">
                  <KeyRound size={13} strokeWidth={2.5} /> Demo Credentials
                </span>
                <button
                  type="button"
                  onClick={fillDemo}
                  className="text-[11px] font-extrabold underline text-[#171717] hover:text-[#b42318] cursor-pointer"
                >
                  Auto-fill ↵
                </button>
              </div>
              <div className="font-mono text-xs text-[#171717] space-y-0.5">
                <p>Email: <strong>admin@campusbid.local</strong></p>
                <p>Password: <strong>Admin@123</strong></p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
