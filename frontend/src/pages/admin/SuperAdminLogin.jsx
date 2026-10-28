import { useState } from 'react'
import { ArrowLeft, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { loginAdmin } from '../../services/studentRosterService.js'

export default function SuperAdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    if (loginAdmin(email, password)) navigate('/admin', { replace: true })
    else setError('Those demo credentials do not match.')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"><ArrowLeft size={17} /> Back to InHerit</Link>
        <div className="mt-8 grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-[1fr_420px]">
          <section className="hidden bg-indigo-950 p-10 text-white md:flex md:flex-col md:justify-between">
            <div><span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-300 text-indigo-950"><ShieldCheck size={25} /></span><h1 className="mt-8 text-4xl font-black leading-tight">InHerit<br />admin console</h1><p className="mt-4 max-w-sm text-sm leading-6 text-indigo-100">Manage the approved student roster and keep marketplace registration on campus.</p></div>
            <p className="text-xs text-indigo-300">Frontend demo · Credentials are not production authentication.</p>
          </section>
          <section className="p-6 sm:p-10">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 md:hidden"><LockKeyhole size={22} /></span>
            <h2 className="mt-5 text-2xl font-black text-slate-950">Super Admin sign in</h2>
            <p className="mt-2 text-sm text-slate-500">Use the demo administrator account.</p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block text-sm font-semibold text-slate-700">Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required autoComplete="username" className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>
              <label className="block text-sm font-semibold text-slate-700">Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required autoComplete="current-password" className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>
              {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700">{error}</p>}
              <button disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700" type="submit"><LockKeyhole size={18} /> Sign in to dashboard</button>
            </form>
            <div className="mt-6 rounded-xl bg-slate-100 p-4 text-xs leading-5 text-slate-600"><strong className="block text-slate-800">Demo credentials</strong>admin@campusbid.local<br />Admin@123</div>
          </section>
        </div>
      </div>
    </main>
  )
}
