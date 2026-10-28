import { AlertTriangle, CheckCircle2, Upload, X } from 'lucide-react'

export default function CSVPreview({ preview, filename, onConfirm, onReset, importing }) {
  if (!preview) return null
  const { rows, totals } = preview

  return (
    <section className="border-[3px] border-[#171717] bg-white shadow-[8px_8px_0_#171717] overflow-hidden" aria-labelledby="preview-heading">
      {/* Header bar */}
      <div className="flex flex-col gap-4 border-b-[3px] border-[#171717] bg-[#f7f3ea] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="admin-eyebrow yellow">CSV Validation Preview</span>
          <h3 id="preview-heading" className="mt-2 text-xl font-['Archivo_Black'] text-[#171717] tracking-tight">
            {filename}
          </h3>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="admin-btn admin-btn-white admin-btn-sm self-start sm:self-auto"
        >
          <X size={15} strokeWidth={3} /> Cancel import
        </button>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-3 border-b-[3px] border-[#171717] bg-white text-center divide-x-2 divide-[#171717]">
        <div className="p-4 sm:p-5">
          <span className="font-['Archivo_Black'] text-2xl sm:text-3xl text-[#171717] block">
            {totals.rows}
          </span>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-500 mt-1 block">
            Processed Rows
          </span>
        </div>
        <div className="p-4 sm:p-5 bg-[#e8faf9]/50">
          <span className="font-['Archivo_Black'] text-2xl sm:text-3xl text-[#0c6b58] block">
            {totals.valid}
          </span>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#0c6b58] mt-1 block">
            Ready to Import
          </span>
        </div>
        <div className="p-4 sm:p-5 bg-[#fff1f0]/60">
          <span className="font-['Archivo_Black'] text-2xl sm:text-3xl text-[#b42318] block">
            {totals.invalid}
          </span>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#b42318] mt-1 block">
            Issues / Excluded
          </span>
        </div>
      </div>

      {/* Table view */}
      <div className="max-h-[460px] overflow-auto">
        <table className="admin-table">
          <thead className="sticky top-0 z-10 shadow-[0_2px_0_#171717]">
            <tr>
              <th>Row</th>
              <th>Student Name</th>
              <th>Roll Number</th>
              <th>Campus Email</th>
              <th>Department</th>
              <th>Validation Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.rowNumber}-${row.email}`}
                className={row.valid ? '' : 'bg-[#fff1f0]/60 hover:bg-[#ffe4e2]'}
              >
                <td className="font-mono text-xs text-neutral-500 font-bold">
                  #{row.rowNumber}
                </td>
                <td className="font-bold text-[#171717]">
                  {row.name || '—'}
                </td>
                <td>
                  <span className="font-mono text-xs bg-[#f7f3ea] px-2 py-0.5 border border-[#171717]">
                    {row.rollNo || '—'}
                  </span>
                </td>
                <td className="font-mono text-xs text-neutral-700 max-w-[220px] truncate">
                  {row.email || '—'}
                </td>
                <td className="text-sm text-neutral-700">
                  {row.department || '—'}
                </td>
                <td className="min-w-[240px]">
                  {row.valid ? (
                    <span className="admin-sticker cyan">
                      <CheckCircle2 size={13} strokeWidth={3} /> Ready
                    </span>
                  ) : (
                    <div className="space-y-1">
                      {row.errors.map((error) => (
                        <span
                          key={error}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#b42318]"
                        >
                          <AlertTriangle size={13} strokeWidth={2.5} className="shrink-0" />
                          {error}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer bar */}
      <div className="flex flex-col gap-4 border-t-[3px] border-[#171717] bg-[#f7f3ea] p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-neutral-700">
          Only the <strong>{totals.valid}</strong> valid row(s) will be committed to the college roster. Duplicate and invalid rows will be ignored.
        </p>
        <button
          type="button"
          disabled={!totals.valid || importing}
          onClick={onConfirm}
          className="admin-btn admin-btn-primary shrink-0"
        >
          <Upload size={17} strokeWidth={3} />
          <span>
            {importing ? 'Processing Import…' : `Confirm Import (${totals.valid} Student${totals.valid === 1 ? '' : 's'})`}
          </span>
        </button>
      </div>
    </section>
  )
}
