import { Search, Trash2, ToggleLeft, ToggleRight, Check, X, Users } from 'lucide-react'

export default function StudentTable({
  students,
  search,
  setSearch,
  status,
  setStatus,
  department,
  setDepartment,
  departments,
  onToggle,
  onRemove,
}) {
  return (
    <div className="space-y-6">
      {/* Filter and search bar */}
      <div className="border-[3px] border-[#171717] bg-white p-5 shadow-[6px_6px_0_#171717]">
        <div className="grid gap-4 md:grid-cols-[1fr_200px_200px]">
          <div className="relative">
            <span className="sr-only">Search roster</span>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#171717]" size={18} strokeWidth={2.5} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, roll no., or email…"
              className="admin-input pl-11"
            />
          </div>

          <div>
            <span className="sr-only">Filter eligibility</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="admin-select"
            >
              <option value="all">All statuses</option>
              <option value="eligible">Eligible only</option>
              <option value="disabled">Disabled only</option>
            </select>
          </div>

          <div>
            <span className="sr-only">Filter department</span>
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className="admin-select"
            >
              <option value="all">All departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t-2 border-[#171717] flex items-center justify-between">
          <span className="admin-sticker yellow">
            {students.length} STUDENT{students.length === 1 ? '' : 'S'} LISTED
          </span>
          {(search || status !== 'all' || department !== 'all') && (
            <button
              type="button"
              onClick={() => { setSearch(''); setStatus('all'); setDepartment('all') }}
              className="text-xs font-mono font-bold text-[#171717] underline hover:text-[#ff806e]"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Roster Table */}
      {students.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll Number</th>
                <th>Department</th>
                <th>Eligibility</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>
                    <strong className="block text-sm font-bold text-[#171717]">
                      {student.name}
                    </strong>
                    <span className="font-mono text-xs text-neutral-500">
                      {student.email}
                    </span>
                  </td>
                  <td>
                    <span className="inline-block font-mono font-bold text-xs bg-[#f7f3ea] px-2.5 py-1 border-2 border-[#171717] shadow-[2px_2px_0_#171717]">
                      {student.rollNo}
                    </span>
                  </td>
                  <td>
                    <span className="text-sm font-medium text-neutral-800">
                      {student.department || 'General / Unassigned'}
                    </span>
                  </td>
                  <td>
                    {student.eligible ? (
                      <span className="admin-sticker cyan">
                        <Check size={13} strokeWidth={3} /> ELIGIBLE
                      </span>
                    ) : (
                      <span className="admin-sticker coral">
                        <X size={13} strokeWidth={3} /> DISABLED
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => onToggle(student)}
                        title={student.eligible ? 'Disable student clearance' : 'Enable student clearance'}
                        aria-label={`${student.eligible ? 'Disable' : 'Enable'} ${student.name}`}
                        className={`admin-btn-icon ${student.eligible ? 'hover:bg-[#ff806e]' : 'hover:bg-[#62cfcc]'}`}
                      >
                        {student.eligible ? (
                          <ToggleRight size={22} strokeWidth={2.5} className="text-[#0c6b58]" />
                        ) : (
                          <ToggleLeft size={22} strokeWidth={2.5} className="text-neutral-400" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(student)}
                        title="Remove student record"
                        aria-label={`Remove ${student.name}`}
                        className="admin-btn-icon hover:bg-[#ff806e]"
                      >
                        <Trash2 size={17} strokeWidth={2.5} className="text-[#171717]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border-[3px] border-dashed border-[#171717] bg-white p-12 text-center shadow-[6px_6px_0_#171717]">
          <div className="w-14 h-14 mx-auto grid place-items-center border-2 border-[#171717] bg-[#ffdc3d] shadow-[3px_3px_0_#171717]">
            <Users size={28} strokeWidth={2.5} className="text-[#171717]" />
          </div>
          <h3 className="mt-4 text-xl font-['Archivo_Black'] text-[#171717]">
            No matching student records
          </h3>
          <p className="mt-1.5 text-sm text-neutral-600 max-w-sm mx-auto">
            Try adjusting your search criteria or upload a new college CSV file to populate the roster.
          </p>
        </div>
      )}
    </div>
  )
}
