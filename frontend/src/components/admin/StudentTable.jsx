import { Search, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

export default function StudentTable({ students, search, setSearch, status, setStatus, department, setDepartment, departments, onToggle, onRemove }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-3 border-b border-slate-200 p-5 lg:grid-cols-[1fr_180px_180px]">
        <label className="relative">
          <span className="sr-only">Search roster</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, roll no., email…" className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
        </label>
        <label>
          <span className="sr-only">Filter eligibility</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500">
            <option value="all">All statuses</option><option value="eligible">Eligible</option><option value="disabled">Disabled</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Filter department</span>
          <select value={department} onChange={(event) => setDepartment(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500">
            <option value="all">All departments</option>{departments.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      {students.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Roll no.</th><th className="px-5 py-3">Department</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4"><strong className="block text-slate-900">{student.name}</strong><span className="text-xs text-slate-500">{student.email}</span></td>
                  <td className="px-5 py-4 font-mono text-slate-700">{student.rollNo}</td>
                  <td className="px-5 py-4 text-slate-700">{student.department || 'Not specified'}</td>
                  <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${student.eligible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{student.eligible ? 'Eligible' : 'Disabled'}</span></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" title={student.eligible ? 'Disable eligibility' : 'Enable eligibility'} onClick={() => onToggle(student)} className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:border-indigo-400 hover:text-indigo-600" aria-label={`${student.eligible ? 'Disable' : 'Enable'} ${student.name}`}>
                        {student.eligible ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                      <button type="button" title="Remove student" onClick={() => onRemove(student)} className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${student.name}`}><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-16 text-center">
          <p className="font-semibold text-slate-800">No student records match.</p>
          <p className="mt-1 text-sm text-slate-500">Adjust the filters or import a CSV to populate the roster.</p>
        </div>
      )}
    </section>
  )
}
