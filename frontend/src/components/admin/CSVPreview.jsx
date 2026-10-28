import { AlertTriangle, CheckCircle2, Upload, X } from 'lucide-react'

export default function CSVPreview({ preview, filename, onConfirm, onReset, importing }) {
  if (!preview) return null
  const { rows, totals } = preview

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="preview-heading">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Upload preview</p>
          <h3 id="preview-heading" className="mt-1 font-semibold text-slate-950">{filename}</h3>
        </div>
        <button type="button" onClick={onReset} className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <X size={16} /> Cancel
        </button>
      </div>

      <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-center">
        <div className="border-r border-slate-200 p-4"><strong className="block text-xl text-slate-950">{totals.rows}</strong><span className="text-xs text-slate-500">Processed</span></div>
        <div className="border-r border-slate-200 p-4"><strong className="block text-xl text-emerald-600">{totals.valid}</strong><span className="text-xs text-slate-500">Ready</span></div>
        <div className="p-4"><strong className="block text-xl text-rose-600">{totals.invalid}</strong><span className="text-xs text-slate-500">Need review</span></div>
      </div>

      <div className="max-h-[420px] overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500 shadow-[0_1px_0_#e2e8f0]">
            <tr>
              <th className="px-4 py-3">Row</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Roll no.</th>
              <th className="px-4 py-3">Email</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={`${row.rowNumber}-${row.email}`} className={row.valid ? '' : 'bg-rose-50/60'}>
                <td className="px-4 py-3 text-slate-500">{row.rowNumber}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{row.name || '—'}</td>
                <td className="px-4 py-3 font-mono text-slate-700">{row.rollNo || '—'}</td>
                <td className="max-w-56 truncate px-4 py-3 text-slate-700">{row.email || '—'}</td>
                <td className="px-4 py-3 text-slate-700">{row.department || '—'}</td>
                <td className="min-w-72 px-4 py-3">
                  {row.valid ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={14} /> Valid</span>
                  ) : (
                    <div className="space-y-1 text-xs font-medium text-rose-700">
                      {row.errors.map((error) => <p key={error} className="flex items-start gap-1"><AlertTriangle className="mt-0.5 shrink-0" size={13} />{error}</p>)}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">Only {totals.valid} valid row(s) will be added. Invalid and conflicting rows are excluded.</p>
        <button type="button" disabled={!totals.valid || importing} onClick={onConfirm} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
          <Upload size={17} /> {importing ? 'Importing…' : `Import ${totals.valid} student${totals.valid === 1 ? '' : 's'}`}
        </button>
      </div>
    </section>
  )
}
