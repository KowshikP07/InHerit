import { useEffect, useMemo, useRef, useState } from 'react'
import { LayoutDashboard, Upload, Users, History, LogOut, Menu, X, FileUp, ShieldCheck, UserCheck, UserX, AlertTriangle } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import CSVPreview from '../../components/admin/CSVPreview.jsx'
import StudentTable from '../../components/admin/StudentTable.jsx'
import ImportHistory from '../../components/admin/ImportHistory.jsx'
import { getAdminSession, getImportHistory, getRoster, importStudents, logoutAdmin, removeStudent, setStudentEligibility } from '../../services/studentRosterService.js'
import { parseStudentCsv, validateCsvFile } from '../../utils/csvValidation.js'

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'import', label: 'Bulk import', icon: Upload },
  { id: 'roster', label: 'Student roster', icon: Users },
  { id: 'history', label: 'Import history', icon: History },
]

export default function SuperAdmin() {
  const navigate = useNavigate()
  const [session] = useState(getAdminSession)
  const [activeTab, setActiveTab] = useState('overview')
  const [roster, setRoster] = useState(getRoster)
  const [history, setHistory] = useState(getImportHistory)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const sync = () => { setRoster(getRoster()); setHistory(getImportHistory()) }
    window.addEventListener('campusbid-roster-updated', sync)
    return () => window.removeEventListener('campusbid-roster-updated', sync)
  }, [])

  if (!session?.role) return <Navigate to="/admin/login" replace />

  function logout() {
    logoutAdmin()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[250px_1fr]">
      {sidebarOpen && <button aria-label="Close navigation overlay" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col bg-slate-950 p-5 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300 text-slate-950"><ShieldCheck size={23} /></span><div><strong className="block">InHerit</strong><span className="text-xs text-slate-400">Super Admin</span></div></div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden" aria-label="Close menu"><X /></button>
        </div>
        <nav className="mt-6 space-y-1">
          {tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setActiveTab(id); setSidebarOpen(false) }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${activeTab === id ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10'}`}><Icon size={18} />{label}</button>)}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4"><p className="mb-3 truncate px-2 text-xs text-slate-400">{session.email}</p><button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10"><LogOut size={18} />Log out</button></div>
      </aside>

      <main className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg border border-slate-300 p-2 lg:hidden" aria-label="Open menu"><Menu size={20} /></button>
          <p className="text-sm font-semibold text-slate-500">{tabs.find((tab) => tab.id === activeTab)?.label}</p>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Demo session</span>
        </header>

        <div className="mx-auto max-w-[1180px] p-4 sm:p-7">
          {activeTab === 'overview' && <Overview roster={roster} history={history} openTab={setActiveTab} />}
          {activeTab === 'import' && <StudentImport />}
          {activeTab === 'roster' && <RosterManager roster={roster} />}
          {activeTab === 'history' && <><PageHeading title="Import history" copy="A persistent audit trail of confirmed CSV batches." /><ImportHistory history={history} /></>}
        </div>
      </main>
    </div>
  )
}

function PageHeading({ title, copy }) {
  return <div className="mb-6"><h1 className="text-2xl font-black text-slate-950 sm:text-3xl">{title}</h1><p className="mt-2 text-sm text-slate-500">{copy}</p></div>
}

function Overview({ roster, history, openTab }) {
  const eligible = roster.filter((student) => student.eligible).length
  return (
    <>
      <PageHeading title="Campus roster overview" copy="Monitor eligibility and keep student registration accurate." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Roster records" value={roster.length} icon={Users} color="bg-indigo-100 text-indigo-700" />
        <Stat label="Eligible students" value={eligible} icon={UserCheck} color="bg-emerald-100 text-emerald-700" />
        <Stat label="Disabled" value={roster.length - eligible} icon={UserX} color="bg-slate-200 text-slate-700" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-950">Recent imports</h2>{history.length ? <div className="mt-4 space-y-3">{history.slice(0, 4).map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3"><div><strong className="text-sm">{item.filename}</strong><p className="text-xs text-slate-500">{item.added} added · {item.invalid ?? 0} invalid</p></div><span className="text-xs text-slate-400">{new Date(item.importedAt).toLocaleDateString()}</span></div>)}</div> : <EmptyPrompt text="No imports yet." />}</section>
        <section className="rounded-2xl border border-slate-200 bg-indigo-950 p-6 text-white shadow-sm"><FileUp className="text-amber-300" size={28} /><h2 className="mt-5 text-xl font-black">Add approved students</h2><p className="mt-2 text-sm leading-6 text-indigo-100">Upload the college CSV, preview conflicts, then confirm the import.</p><button onClick={() => openTab('import')} className="mt-5 rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-bold text-slate-950">Import CSV</button></section>
      </div>
    </>
  )
}

function Stat({ label, value, icon: Icon, color }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon size={21} /></span><strong className="mt-5 block text-3xl text-slate-950">{value}</strong><span className="text-sm text-slate-500">{label}</span></article>
}

function EmptyPrompt({ text }) { return <p className="mt-5 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">{text}</p> }

function StudentImport() {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [filename, setFilename] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)

  async function processFile(file) {
    setError(''); setStatus(''); setPreview(null)
    const validationError = validateCsvFile(file)
    if (validationError) { setError(validationError); return }
    setStatus('Reading and validating CSV…')
    try {
      const result = parseStudentCsv(await file.text())
      if (!result.ok) { setError(result.error); setStatus(''); return }
      setFilename(file.name); setPreview(result); setStatus('')
    } catch {
      setError('The CSV could not be read. Check that it is a valid UTF-8 or comma-separated file.')
      setStatus('')
    }
  }

  function reset() { setPreview(null); setFilename(''); setError(''); setStatus(''); if (inputRef.current) inputRef.current.value = '' }

  function confirm() {
    if (!preview?.valid.length) return
    setImporting(true)
    const result = importStudents(preview.valid, filename, { totalRows: preview.totals.rows, duplicates: preview.invalid.filter((row) => row.errors.some((error) => error.includes('Duplicate') || error.includes('already exists'))).length, invalid: preview.invalid.length })
    setStatus(`${result.added} students added. ${preview.invalid.length} row(s) excluded.`)
    setImporting(false); setPreview(null); setFilename(''); if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <>
      <PageHeading title="Bulk student import" copy="Upload the college eligibility list. Nothing is added until you confirm." />
      <div onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); processFile(event.dataTransfer.files[0]) }} className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white'}`}>
        <FileUp className="mx-auto text-indigo-600" size={34} /><h2 className="mt-3 font-bold text-slate-950">Drop a college CSV here</h2><p className="mt-1 text-sm text-slate-500">Maximum 5 MB · headers: Name, RollNo, Email, optional Dept, gender, student_type, dob</p>
        <input ref={inputRef} id="student-csv" type="file" accept=".csv,text/csv" onChange={(event) => processFile(event.target.files[0])} className="sr-only" />
        <button onClick={() => inputRef.current?.click()} type="button" className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Choose CSV file</button>
      </div>
      {error && <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"><AlertTriangle className="shrink-0" size={18} />{error}</p>}
      {status && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{status}</p>}
      {preview && <div className="mt-6"><CSVPreview preview={preview} filename={filename} onConfirm={confirm} onReset={reset} importing={importing} /></div>}
    </>
  )
}

function RosterManager({ roster }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [department, setDepartment] = useState('all')
  const [pendingRemoval, setPendingRemoval] = useState(null)

  const departments = useMemo(() => [...new Set(roster.map((student) => student.department).filter(Boolean))].sort(), [roster])
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return roster.filter((student) => {
      const matchesSearch = !term || [student.name, student.rollNo, student.email, student.department].some((value) => String(value).toLowerCase().includes(term))
      const matchesStatus = status === 'all' || (status === 'eligible' ? student.eligible : !student.eligible)
      const matchesDepartment = department === 'all' || student.department === department
      return matchesSearch && matchesStatus && matchesDepartment
    })
  }, [roster, search, status, department])

  return (
    <>
      <PageHeading title="Student roster" copy={`${roster.length} records · ${roster.filter((student) => student.eligible).length} eligible`} />
      <StudentTable students={filtered} search={search} setSearch={setSearch} status={status} setStatus={setStatus} department={department} setDepartment={setDepartment} departments={departments} onToggle={(student) => setStudentEligibility(student.id, !student.eligible)} onRemove={setPendingRemoval} />
      {pendingRemoval && <ConfirmDialog title="Remove student record?" description={`${pendingRemoval.name} (${pendingRemoval.rollNo}) will be removed from the local roster. This action cannot be undone.`} confirmLabel="Remove student" onCancel={() => setPendingRemoval(null)} onConfirm={() => { removeStudent(pendingRemoval.id); setPendingRemoval(null) }} />}
    </>
  )
}

function ConfirmDialog({ title, description, confirmLabel, onCancel, onConfirm }) {
  return <div role="presentation" onMouseDown={onCancel} className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"><section role="dialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600"><AlertTriangle size={22} /></span><h2 id="confirm-title" className="mt-4 text-xl font-black text-slate-950">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p><div className="mt-6 flex justify-end gap-3"><button onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold">Cancel</button><button onClick={onConfirm} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white">{confirmLabel}</button></div></section></div>
}
