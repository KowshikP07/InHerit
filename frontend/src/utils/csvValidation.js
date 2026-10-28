import Papa from 'papaparse'
import { getRoster, normalizeEmail } from '../services/studentRosterService.js'

export const REQUIRED_HEADERS = ['Name', 'RollNo', 'Email']
export const MAX_FILE_SIZE = 5 * 1024 * 1024

const normalizedHeader = (value) => String(value ?? '').replace(/^\ufeff/, '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
const headerMap = new Map([
  ['name', 'name'], ['rollno', 'rollNo'], ['email', 'email'],
  ['dept', 'department'], ['gender', 'gender'], ['studenttype', 'studentType'], ['dob', 'dob'],
])

export function validateCsvFile(file) {
  if (!file) return 'Choose a CSV file to continue.'
  if (!/\.csv$/i.test(file.name)) return 'Only .csv files are supported.'
  if (file.size === 0) return 'The selected CSV file is empty.'
  if (file.size > MAX_FILE_SIZE) return 'The CSV file must be 5 MB or smaller.'
  return null
}

export function parseStudentCsv(text) {
  const parsed = Papa.parse(text, {
    skipEmptyLines: 'greedy',
  })

  if (parsed.errors.length && parsed.errors.every((error) => error.code === 'TooFewFields')) {
    // Papa's row-level field count is handled below as a missing required-column error.
  } else if (parsed.errors.length) {
    return { ok: false, error: `CSV parsing failed: ${parsed.errors[0].message}` }
  }

  const [rawHeaders = [], ...rawRows] = parsed.data
  if (!rawHeaders.length) return { ok: false, error: 'The CSV has no header row.' }

  const headers = rawHeaders.map((header) => {
    const normalized = normalizedHeader(header)
    return headerMap.get(normalized) ?? normalized
  })
  const missingHeaders = REQUIRED_HEADERS.filter((header) => {
    const normalized = normalizedHeader(header)
    return !headers.includes(normalized === 'rollno' ? 'rollNo' : normalized)
  })

  if (missingHeaders.length) {
    return { ok: false, error: `Missing required columns: ${missingHeaders.join(', ')}.` }
  }

  const existing = getRoster()
  const existingEmails = new Set(existing.map((student) => normalizeEmail(student.email)))
  const existingRollNos = new Set(existing.map((student) => String(student.rollNo).trim().toLowerCase()))
  const seenEmails = new Map()
  const seenRollNos = new Map()
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const rows = rawRows.map((values, index) => {
    const source = Object.fromEntries(headers.map((header, columnIndex) => [header, String(values[columnIndex] ?? '').trim()]))
    const rowNumber = index + 2
    const name = source.name ?? ''
    const rollNo = String(source.rollNo ?? '').trim()
    const email = normalizeEmail(source.email)
    const department = String(source.department ?? '').trim()
    const errors = []

    if (!name) errors.push('Name is required.')
    if (!rollNo) errors.push('RollNo is required.')
    if (!email) errors.push('Email is required.')
    else if (!emailPattern.test(email)) errors.push('Email is not in a valid format.')

    if (email && seenEmails.has(email)) errors.push(`Duplicate email within this file (first at row ${seenEmails.get(email)}).`)
    else if (email) seenEmails.set(email, rowNumber)

    if (rollNo && seenRollNos.has(rollNo.toLowerCase())) {
      errors.push(`Duplicate roll number within this file (first at row ${seenRollNos.get(rollNo.toLowerCase())}).`)
    } else if (rollNo) seenRollNos.set(rollNo.toLowerCase(), rowNumber)

    if (email && existingEmails.has(email)) errors.push('Email already exists in the approved roster.')
    if (rollNo && existingRollNos.has(rollNo.toLowerCase())) errors.push('Roll number already exists in the approved roster.')

    return {
      rowNumber,
      name,
      rollNo,
      email,
      department,
      eligible: true,
      valid: errors.length === 0,
      errors,
    }
  })

  const valid = rows.filter((row) => row.valid)
  const invalid = rows.filter((row) => !row.valid)
  return { ok: true, rows, valid, invalid, totals: { rows: rows.length, valid: valid.length, invalid: invalid.length } }
}
