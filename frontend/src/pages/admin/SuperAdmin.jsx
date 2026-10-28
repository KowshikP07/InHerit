import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LayoutDashboard,
  Upload,
  Users,
  History,
  LogOut,
  Menu,
  X,
  FileUp,
  ShieldCheck,
  UserCheck,
  UserX,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import CSVPreview from '../../components/admin/CSVPreview.jsx'
import StudentTable from '../../components/admin/StudentTable.jsx'
import ImportHistory from '../../components/admin/ImportHistory.jsx'
import {
  getAdminSession,
  getImportHistory,
  getRoster,
  importStudents,
  logoutAdmin,
  removeStudent,
  setStudentEligibility,
} from '../../services/studentRosterService.js'
import { parseStudentCsv, validateCsvFile } from '../../utils/csvValidation.js'
import '../../admin-theme.css'

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
    const sync = () => {
      setRoster(getRoster())
      setHistory(getImportHistory())
    }
    window.addEventListener('campusbid-roster-updated', sync)
    return () => window.removeEventListener('campusbid-roster-updated', sync)
  }, [])

  if (!session?.role) return <Navigate to="/admin/login" replace />

  function logout() {
    logoutAdmin()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="admin-theme min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <button
          aria-label="Close navigation overlay"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-[#171717]/70 lg:hidden"
        />
      )}

      {/* Neo-brutalist Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-[#171717] p-6 text-white border-r-[3px] border-[#171717] transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 shadow-[8px_0_0_#ffdc3d]' : '-translate-x-full'
        }`}
      >
        {/* Brand identity header */}
        <div className="flex items-center justify-between border-b-2 border-neutral-800 pb-5">
          <Link to="/" className="flex items-center gap-3 text-white no-underline">
            <span className="w-10 h-10 grid place-items-center border-2 border-[#171717] bg-[#ffdc3d] text-xl shadow-[3px_3px_0_#ff806e] rotate-[-3deg] text-[#171717]">
              🎓
            </span>
            <div>
              <strong className="font-['Archivo_Black'] text-xl tracking-tight block text-white">InHerit</strong>
              <span className="text-[11px] font-mono text-[#ffdc3d] font-bold tracking-wider uppercase block">Super Admin</span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 grid place-items-center border-2 border-white bg-transparent text-white lg:hidden cursor-pointer"
            aria-label="Close menu"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tab navigation */}
        <nav className="mt-6 space-y-2 flex-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id)
                setSidebarOpen(false)
              }}
              className={`admin-sidebar-nav-btn ${activeTab === id ? 'active' : ''}`}
            >
              <Icon size={19} strokeWidth={2.5} className="shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="mt-auto border-t-2 border-neutral-800 pt-5 space-y-3">
          {/* Quick links to frontend */}
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400 px-1">
            <Link to="/" className="hover:text-[#ffdc3d] flex items-center gap-1">
              Landing Page <ExternalLink size={11} />
            </Link>
            <Link to="/auctions" className="hover:text-[#62cfcc] flex items-center gap-1">
              Auctions <ExternalLink size={11} />
            </Link>
          </div>

          {/* Admin User Card */}
          <div className="border-2 border-neutral-700 bg-neutral-900 p-3 shadow-[3px_3px_0_#ffdc3d]">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#62cfcc] animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-wider text-neutral-400 uppercase">Authenticated Session</span>
            </div>
            <p className="font-mono text-xs text-white truncate font-bold">
              {session.email}
            </p>
          </div>

          <button
            onClick={logout}
            className="admin-btn admin-btn-primary admin-btn-sm w-full"
          >
            <LogOut size={16} strokeWidth={2.5} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Page Area */}
      <main className="min-w-0 flex flex-col bg-[#f7f3ea]">
        {/* Sticky Neo-brutalist Topbar */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b-[3px] border-[#171717] bg-[#f7f3ea]/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="admin-btn-icon lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} strokeWidth={2.5} />
            </button>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500 block">
                ADMIN CONSOLE
              </span>
              <span className="font-['Archivo_Black'] text-lg text-[#171717] uppercase tracking-tight">
                {tabs.find((tab) => tab.id === activeTab)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/auctions"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono font-bold border-2 border-[#171717] bg-white px-3 py-1.5 shadow-[2px_2px_0_#171717] hover:bg-[#ffdc3d] transition-colors"
            >
              <span>Campus Live</span>
              <ArrowRight size={13} strokeWidth={2.5} />
            </Link>
            <span className="admin-sticker cyan">
              ● SUPERUSER ACTIVE
            </span>
          </div>
        </header>

        {/* Content Body */}
        <div className="mx-auto w-full max-w-[1200px] p-5 sm:p-8 flex-1">
          {activeTab === 'overview' && (
            <Overview roster={roster} history={history} openTab={setActiveTab} />
          )}
          {activeTab === 'import' && <StudentImport />}
          {activeTab === 'roster' && <RosterManager roster={roster} />}
          {activeTab === 'history' && (
            <>
              <PageHeading
                eyebrow="AUDIT TRAIL"
                title="CSV IMPORT HISTORY"
                copy="Persistent log of all confirmed campus student CSV batches."
              />
              <ImportHistory history={history} />
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function PageHeading({ eyebrow = 'ADMINISTRATION', title, copy }) {
  return (
    <div className="mb-8">
      <span className="admin-eyebrow">{eyebrow}</span>
      <h1 className="text-3xl sm:text-4xl font-['Archivo_Black'] tracking-tight text-[#171717] mt-3">
        {title}
      </h1>
      <p className="mt-2 text-sm sm:text-base text-neutral-700 font-medium max-w-2xl">
        {copy}
      </p>
    </div>
  )
}

function Overview({ roster, history, openTab }) {
  const eligible = roster.filter((student) => student.eligible).length
  const disabled = roster.length - eligible

  return (
    <>
      <PageHeading
        eyebrow="SYSTEM OVERVIEW"
        title="CAMPUS ROSTER CONTROL"
        copy="Manage student clearance records, review CSV upload history, and administer campus buyer eligibility."
      />

      {/* Neo-brutalist Stat Cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        <article className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-label">Total Student Records</span>
            <span className="admin-stat-icon bg-[#62cfcc]">
              <Users size={22} strokeWidth={2.5} className="text-[#171717]" />
            </span>
          </div>
          <div>
            <div className="admin-stat-num">{roster.length}</div>
            <span className="admin-sticker paper">Verified on campus</span>
          </div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-label">Eligible Students</span>
            <span className="admin-stat-icon bg-[#ffdc3d]">
              <UserCheck size={22} strokeWidth={2.5} className="text-[#171717]" />
            </span>
          </div>
          <div>
            <div className="admin-stat-num text-[#0c6b58]">{eligible}</div>
            <span className="admin-sticker cyan">Can Bid & Purchase</span>
          </div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-header">
            <span className="admin-stat-label">Disabled / On Hold</span>
            <span className="admin-stat-icon bg-[#ff806e]">
              <UserX size={22} strokeWidth={2.5} className="text-[#171717]" />
            </span>
          </div>
          <div>
            <div className="admin-stat-num text-[#b42318]">{disabled}</div>
            <span className="admin-sticker coral">Clearance Paused</span>
          </div>
        </article>
      </div>

      {/* Two Column Grid */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Recent Imports Card */}
        <section className="border-[3px] border-[#171717] bg-white p-6 shadow-[7px_7px_0_#171717] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b-2 border-[#171717] pb-4">
              <div>
                <span className="admin-eyebrow yellow">Recent Ingestions</span>
                <h2 className="text-xl font-['Archivo_Black'] text-[#171717] mt-2">
                  Confirmed Batches
                </h2>
              </div>
              <button
                type="button"
                onClick={() => openTab('history')}
                className="text-xs font-mono font-bold text-[#171717] underline hover:text-[#ff806e]"
              >
                View all ({history.length}) →
              </button>
            </div>

            {history.length ? (
              <div className="mt-5 space-y-3">
                {history.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-2 border-[#171717] bg-[#f7f3ea] p-3.5 shadow-[3px_3px_0_#171717]"
                  >
                    <div>
                      <strong className="block text-sm font-bold text-[#171717]">
                        {item.filename}
                      </strong>
                      <p className="font-mono text-xs text-neutral-600 mt-0.5">
                        +{item.added} added · {item.invalid ?? 0} excluded
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold bg-white px-2 py-1 border border-[#171717]">
                      {new Date(item.importedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="my-8 border-2 border-dashed border-[#171717] p-8 text-center bg-[#f7f3ea]">
                <p className="font-mono text-xs text-neutral-600 font-bold uppercase tracking-wider">
                  No CSV batches uploaded yet
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t-2 border-[#171717]">
            <button
              onClick={() => openTab('history')}
              className="admin-btn admin-btn-white admin-btn-sm w-full"
            >
              Inspect Audit History
            </button>
          </div>
        </section>

        {/* Blueprint Action Banner */}
        <section className="border-[3px] border-[#171717] bg-[#6a86f4] text-white p-7 shadow-[8px_8px_0_#171717] flex flex-col justify-between relative overflow-hidden [background-image:linear-gradient(rgba(255,255,255,.14)_2px,transparent_2px),linear-gradient(90deg,rgba(255,255,255,.14)_2px,transparent_2px)] [background-size:24px_24px]">
          {/* Decorative Spark */}
          <div className="admin-spark text-[#ffdc3d] top-4 right-4 text-4xl rotate-12">★</div>

          <div>
            <span className="admin-eyebrow yellow text-[#171717]">Batch Processing</span>
            <div className="w-12 h-12 grid place-items-center border-2 border-[#171717] bg-[#ffdc3d] text-[#171717] shadow-[3px_3px_0_#171717] mt-4">
              <FileUp size={24} strokeWidth={2.5} />
            </div>
            <h2 className="mt-5 text-2xl sm:text-3xl font-['Archivo_Black'] leading-tight tracking-tight text-white [text-shadow:2px_2px_0_#171717]">
              UPDATE STUDENT ROSTER
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-indigo-50 font-medium">
              Upload standard college CSV rosters containing Roll Numbers, Full Names, and university emails to synchronize campus clearance.
            </p>
          </div>

          <div className="mt-8 pt-5 border-t-2 border-white/30">
            <button
              onClick={() => openTab('import')}
              className="admin-btn admin-btn-yellow w-full text-base py-3.5 shadow-[5px_5px_0_#171717]"
            >
              <span>Upload CSV Roster</span>
              <ArrowRight size={18} strokeWidth={3} />
            </button>
          </div>
        </section>
      </div>
    </>
  )
}

function StudentImport() {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [filename, setFilename] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)

  async function processFile(file) {
    if (!file) return
    setError('')
    setStatus('')
    setPreview(null)
    const validationError = validateCsvFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setStatus('Parsing and checking headers in CSV…')
    try {
      const result = parseStudentCsv(await file.text())
      if (!result.ok) {
        setError(result.error)
        setStatus('')
        return
      }
      setFilename(file.name)
      setPreview(result)
      setStatus('')
    } catch {
      setError('The CSV file could not be parsed. Verify that it contains valid UTF-8 comma-separated text.')
      setStatus('')
    }
  }

  function reset() {
    setPreview(null)
    setFilename('')
    setError('')
    setStatus('')
    if (inputRef.current) inputRef.current.value = ''
  }

  async function confirm() {
    if (!preview?.valid.length) return
    setImporting(true)
    const result = await importStudents(preview.valid, filename, {
      totalRows: preview.totals.rows,
      duplicates: preview.invalid.filter((row) =>
        row.errors.some((err) => err.includes('Duplicate') || err.includes('already exists')),
      ).length,
      invalid: preview.invalid.length,
    })
    setStatus(`Success: ${result.added} student(s) added to the active roster. ${preview.invalid.length} row(s) excluded.`)
    setImporting(false)
    setPreview(null)
    setFilename('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <>
      <PageHeading
        eyebrow="BATCH INGESTION"
        title="BULK STUDENT CSV IMPORT"
        copy="Upload the official college eligibility records. Data will only be saved after you inspect and confirm the validation preview."
      />

      {/* Drag & Drop Box */}
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          processFile(event.dataTransfer.files[0])
        }}
        className={`admin-dropzone ${dragging ? 'dragging' : ''}`}
      >
        <div className="w-14 h-14 mx-auto grid place-items-center border-2 border-[#171717] bg-[#ffdc3d] shadow-[4px_4px_0_#171717]">
          <FileUp className="text-[#171717]" size={28} strokeWidth={2.5} />
        </div>
        <h2 className="mt-5 text-2xl font-['Archivo_Black'] text-[#171717]">
          Drop your college CSV file here
        </h2>
        <p className="mt-2 text-xs sm:text-sm font-mono text-neutral-600 max-w-md mx-auto">
          Maximum 5 MB · Required headers: <strong>Name, RollNo, Email</strong> · Optional: Dept, Year
        </p>

        <input
          ref={inputRef}
          id="student-csv"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => processFile(event.target.files[0])}
          className="sr-only"
        />

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => inputRef.current?.click()}
            type="button"
            className="admin-btn admin-btn-primary"
          >
            <span>Choose CSV File from Computer</span>
            <ArrowRight size={17} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div role="alert" className="admin-alert admin-alert-error mt-6">
          <AlertTriangle size={20} className="shrink-0 text-[#b42318]" strokeWidth={2.5} />
          <span>{error}</span>
        </div>
      )}

      {status && (
        <div role="status" className="admin-alert admin-alert-success mt-6">
          <ShieldCheck size={20} className="shrink-0 text-[#0c6b58]" strokeWidth={2.5} />
          <span>{status}</span>
        </div>
      )}

      {/* Preview Section */}
      {preview && (
        <div className="mt-8">
          <CSVPreview
            preview={preview}
            filename={filename}
            onConfirm={confirm}
            onReset={reset}
            importing={importing}
          />
        </div>
      )}
    </>
  )
}

function RosterManager({ roster }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [department, setDepartment] = useState('all')
  const [pendingRemoval, setPendingRemoval] = useState(null)

  const departments = useMemo(
    () => [...new Set(roster.map((student) => student.department).filter(Boolean))].sort(),
    [roster],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return roster.filter((student) => {
      const matchesSearch =
        !term ||
        [student.name, student.rollNo, student.email, student.department].some((value) =>
          String(value).toLowerCase().includes(term),
        )
      const matchesStatus =
        status === 'all' || (status === 'eligible' ? student.eligible : !student.eligible)
      const matchesDepartment = department === 'all' || student.department === department
      return matchesSearch && matchesStatus && matchesDepartment
    })
  }, [roster, search, status, department])

  return (
    <>
      <PageHeading
        eyebrow="DIRECTORY"
        title="CAMPUS STUDENT ROSTER"
        copy={`${roster.length} registered campus records · ${
          roster.filter((student) => student.eligible).length
        } currently cleared for live auctions.`}
      />

      <StudentTable
        students={filtered}
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        department={department}
        setDepartment={setDepartment}
        departments={departments}
        onToggle={(student) => setStudentEligibility(student.id, !student.eligible)}
        onRemove={setPendingRemoval}
      />

      {pendingRemoval && (
        <ConfirmDialog
          title="Remove Student Record?"
          description={`${pendingRemoval.name} (${pendingRemoval.rollNo}) will be permanently removed from the local campus roster. They will no longer be verified for student bidding.`}
          confirmLabel="Remove Record"
          onCancel={() => setPendingRemoval(null)}
          onConfirm={() => {
            removeStudent(pendingRemoval.id)
            setPendingRemoval(null)
          }}
        />
      )}
    </>
  )
}

function ConfirmDialog({ title, description, confirmLabel, onCancel, onConfirm }) {
  return (
    <div
      role="presentation"
      onMouseDown={onCancel}
      className="admin-modal-backdrop"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="admin-modal-box"
      >
        <button
          onClick={onCancel}
          className="admin-btn-icon absolute right-5 top-5"
          aria-label="Close dialog"
        >
          <X size={18} strokeWidth={3} />
        </button>

        <span className="w-12 h-12 grid place-items-center border-2 border-[#171717] bg-[#ff806e] text-[#171717] shadow-[3px_3px_0_#171717]">
          <AlertTriangle size={24} strokeWidth={2.5} />
        </span>

        <h2 id="confirm-title" className="mt-5 text-2xl font-['Archivo_Black'] text-[#171717]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-700 font-medium">
          {description}
        </p>

        <div className="mt-8 flex justify-end gap-3 border-t-2 border-[#171717] pt-5">
          <button
            onClick={onCancel}
            type="button"
            className="admin-btn admin-btn-white"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            type="button"
            className="admin-btn admin-btn-primary"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
