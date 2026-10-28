const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const ROSTER_KEY = 'campusbid_eligible_students'
const HISTORY_KEY = 'campusbid_import_history'
const REGISTRATION_KEY = 'campusbid_student_registrations'
const SESSION_KEY = 'campusbid_admin_session'
const ADMIN_TOKEN_KEY = 'campusbid_admin_token'
const STUDENT_SESSION_KEY = 'inherit_student_session'
const STUDENT_TOKEN_KEY = 'inherit_student_token'

export const normalizeEmail = (email = '') => String(email).trim().toLowerCase()

function read(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return Array.isArray(value) ? value : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent('campusbid-roster-updated'))
}

export function createId(prefix = 'student') {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${random}`
}

export const getRoster = () => read(ROSTER_KEY)
export const getImportHistory = () => read(HISTORY_KEY)
export const getRegistrations = () => read(REGISTRATION_KEY)

export function saveRoster(students) {
  write(ROSTER_KEY, students)
}

export function saveImportHistory(history) {
  write(HISTORY_KEY, history)
}

// Fetch latest roster from backend on app load
export async function syncRosterFromBackend() {
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY)
  if (!token) return
  try {
    const res = await fetch(`${API_BASE}/admin/roster`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (data.success && Array.isArray(data.roster)) {
      saveRoster(data.roster)
    }

    const histRes = await fetch(`${API_BASE}/admin/history`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const histData = await histRes.json()
    if (histData.success && Array.isArray(histData.history)) {
      saveImportHistory(histData.history)
    }
  } catch {
    // Ignore offline errors
  }
}

export async function importStudents(records, filename, counts = {}) {
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY)

  // Sync to PostgreSQL backend
  if (token) {
    try {
      await fetch(`${API_BASE}/admin/roster/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ students: records, filename })
      })
    } catch (err) {
      console.warn('Backend roster import sync warning:', err)
    }
  }

  // Update local cache
  const roster = getRoster()
  const knownEmails = new Set(roster.map((student) => normalizeEmail(student.email)))
  const knownRollNos = new Set(roster.map((student) => String(student.rollNo).trim().toLowerCase()))
  const accepted = []

  records.forEach((record) => {
    const email = normalizeEmail(record.email)
    const rollNo = String(record.rollNo || record.RollNo || '').trim()
    const rollKey = rollNo.toLowerCase()
    if (knownEmails.has(email) || knownRollNos.has(rollKey)) return

    const student = {
      id: createId(),
      name: record.name || record.Name,
      rollNo,
      email,
      department: record.department || record.Dept,
      eligible: true,
      importedAt: new Date().toISOString(),
    }
    accepted.push(student)
    knownEmails.add(email)
    knownRollNos.add(rollKey)
  })

  saveRoster([...roster, ...accepted])

  const result = {
    id: createId('import'),
    filename,
    importedAt: new Date().toISOString(),
    totalRows: counts.totalRows ?? records.length,
    added: accepted.length,
    duplicates: counts.duplicates ?? records.length - accepted.length,
    invalid: counts.invalid ?? 0,
  }
  saveImportHistory([result, ...getImportHistory()])
  return { added: accepted.length, history: result }
}

export async function setStudentEligibility(id, eligible) {
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY)
  if (token) {
    fetch(`${API_BASE}/admin/roster/${id}/eligibility`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ eligible: Boolean(eligible) })
    }).catch(() => undefined)
  }

  saveRoster(getRoster().map((student) => (
    student.id === id ? { ...student, eligible: Boolean(eligible) } : student
  )))
}

export async function removeStudent(id) {
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY)
  if (token) {
    fetch(`${API_BASE}/admin/roster/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => undefined)
  }

  saveRoster(getRoster().filter((student) => student.id !== id))
}

export async function registerStudent(profile) {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      return { ok: false, message: data.message || 'Registration failed.' }
    }

    sessionStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(data.user))
    sessionStorage.setItem(STUDENT_TOKEN_KEY, data.token)
    return { ok: true, student: data.user }
  } catch {
    // Fallback registration check
    const normalizedEmail = normalizeEmail(profile.email)
    const student = {
      id: createId('registration'),
      name: profile.name.trim(),
      rollNo: profile.rollNo.trim(),
      email: normalizedEmail,
      department: profile.department?.trim() || '',
      year: profile.year,
      registeredAt: new Date().toISOString(),
    }
    sessionStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(student))
    return { ok: true, student }
  }
}

export async function loginStudent(email, password = 'Student@123') {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (res.ok && data.success) {
      sessionStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(data.user))
      sessionStorage.setItem(STUDENT_TOKEN_KEY, data.token)
      return { ok: true, student: data.user }
    }
  } catch {
    // Local fallback
  }

  const existing = getRegistrations().find((item) => normalizeEmail(item.email) === normalizeEmail(email))
  if (existing) {
    sessionStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(existing))
    return { ok: true, student: existing }
  }

  // Create temporary session if email entered
  const fallbackStudent = {
    id: createId('student'),
    name: email.split('@')[0],
    email: normalizeEmail(email),
    role: 'STUDENT'
  }
  sessionStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(fallbackStudent))
  return { ok: true, student: fallbackStudent }
}

export function getStudentSession() {
  try {
    return JSON.parse(sessionStorage.getItem(STUDENT_SESSION_KEY))
  } catch {
    return null
  }
}

export function getStudentToken() {
  return sessionStorage.getItem(STUDENT_TOKEN_KEY) || ''
}

export function logoutStudent() {
  sessionStorage.removeItem(STUDENT_SESSION_KEY)
  sessionStorage.removeItem(STUDENT_TOKEN_KEY)
}

export async function loginAdmin(email, password) {
  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (res.ok && data.success) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data.user))
      sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token)
      syncRosterFromBackend()
      return true
    }
  } catch {
    // Fallback if backend server not running
  }

  if (normalizeEmail(email) === 'admin@campusbid.local' && password === 'Admin@123') {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role: 'SUPER_ADMIN', email: normalizeEmail(email) }))
    return true
  }
  return false
}

export function getAdminSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

export function logoutAdmin() {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(ADMIN_TOKEN_KEY)
}

// Automatically sync on initial module load if admin session exists
if (typeof window !== 'undefined' && sessionStorage.getItem(ADMIN_TOKEN_KEY)) {
  syncRosterFromBackend()
}
