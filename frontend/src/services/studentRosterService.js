const ROSTER_KEY = 'campusbid_eligible_students'
const HISTORY_KEY = 'campusbid_import_history'
const REGISTRATION_KEY = 'campusbid_student_registrations'
const SESSION_KEY = 'campusbid_admin_session'
const STUDENT_SESSION_KEY = 'inherit_student_session'

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

export function importStudents(records, filename, counts = {}) {
  const roster = getRoster()
  const knownEmails = new Set(roster.map((student) => normalizeEmail(student.email)))
  const knownRollNos = new Set(roster.map((student) => String(student.rollNo).trim().toLowerCase()))
  const accepted = []

  records.forEach((record) => {
    const email = normalizeEmail(record.email)
    const rollNo = String(record.rollNo).trim()
    const rollKey = rollNo.toLowerCase()
    if (knownEmails.has(email) || knownRollNos.has(rollKey)) return

    const student = {
      id: createId(),
      name: record.name,
      rollNo,
      email,
      department: record.department,
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

export function setStudentEligibility(id, eligible) {
  saveRoster(getRoster().map((student) => (
    student.id === id ? { ...student, eligible: Boolean(eligible) } : student
  )))
}

export function removeStudent(id) {
  saveRoster(getRoster().filter((student) => student.id !== id))
}

export function checkStudentEligibility(email) {
  const student = getRoster().find((item) => normalizeEmail(item.email) === normalizeEmail(email))
  if (!student) return { ok: false, reason: 'not-found', message: 'This email is not on the approved student roster.' }
  if (!student.eligible) return { ok: false, reason: 'disabled', message: 'This student record is currently disabled. Contact the campus administrator.' }
  return { ok: true, student }
}

export function registerStudent(profile) {
  const registrations = getRegistrations()
  const normalizedEmail = normalizeEmail(profile.email)
  if (registrations.some((item) => normalizeEmail(item.email) === normalizedEmail)) {
    return { ok: false, message: 'An account for this email has already been registered.' }
  }

  const student = {
    id: createId('registration'),
    name: profile.name.trim(),
    rollNo: profile.rollNo.trim(),
    email: normalizedEmail,
    department: profile.department.trim(),
    year: profile.year,
    registeredAt: new Date().toISOString(),
  }
  write(REGISTRATION_KEY, [student, ...registrations])
  return { ok: true, student }
}

export function getAdminSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

export function loginAdmin(email, password) {
  if (normalizeEmail(email) !== 'admin@campusbid.local' || password !== 'Admin@123') return false
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role: 'SUPER_ADMIN', email: normalizeEmail(email), signedInAt: new Date().toISOString() }))
  return true
}

export function logoutAdmin() {
  sessionStorage.removeItem(SESSION_KEY)
}

export function loginStudent(email) {
  const registration = getRegistrations().find((item) => normalizeEmail(item.email) === normalizeEmail(email))
  if (!registration) return { ok: false, message: 'No InHerit student account exists for this email.' }

  sessionStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(registration))
  return { ok: true, student: registration }
}

export function getStudentSession() {
  try {
    const student = JSON.parse(sessionStorage.getItem(STUDENT_SESSION_KEY))
    if (!student?.id || !student?.email) return null
    return getRegistrations().find((item) => item.id === student.id) ?? null
  } catch {
    return null
  }
}

export function logoutStudent() {
  sessionStorage.removeItem(STUDENT_SESSION_KEY)
}
