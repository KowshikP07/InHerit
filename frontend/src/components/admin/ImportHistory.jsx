import { Clock3, FileSpreadsheet, Check, AlertCircle } from 'lucide-react'

export default function ImportHistory({ history }) {
  if (!history.length) {
    return (
      <section className="border-[3px] border-dashed border-[#171717] bg-white p-12 text-center shadow-[6px_6px_0_#171717]">
        <div className="w-14 h-14 mx-auto grid place-items-center border-2 border-[#171717] bg-[#ffdc3d] shadow-[3px_3px_0_#171717]">
          <FileSpreadsheet className="text-[#171717]" size={28} strokeWidth={2.5} />
        </div>
        <h3 className="mt-4 text-xl font-['Archivo_Black'] text-[#171717]">
          No import history found
        </h3>
        <p className="mt-1 text-sm text-neutral-600 max-w-sm mx-auto">
          Audit entries will be recorded here whenever you upload and confirm student roster CSV batches.
        </p>
      </section>
    )
  }

  return (
    <section className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>File Name</th>
            <th>Imported Date & Time</th>
            <th>Total Rows</th>
            <th>Students Added</th>
            <th>Duplicates Excluded</th>
            <th>Invalid Rows</th>
          </tr>
        </thead>
        <tbody>
          {history.map((batch) => (
            <tr key={batch.id}>
              <td>
                <span className="flex items-center gap-2.5 font-bold text-[#171717]">
                  <span className="w-8 h-8 grid place-items-center border-2 border-[#171717] bg-[#ffdc3d] shrink-0 shadow-[2px_2px_0_#171717]">
                    <FileSpreadsheet size={15} strokeWidth={2.5} />
                  </span>
                  <span>{batch.filename}</span>
                </span>
              </td>
              <td>
                <span className="flex items-center gap-1.5 font-mono text-xs text-neutral-600">
                  <Clock3 size={14} strokeWidth={2} />
                  {new Date(batch.importedAt).toLocaleString()}
                </span>
              </td>
              <td className="font-mono font-bold text-xs text-neutral-800">
                {batch.totalRows}
              </td>
              <td>
                <span className="admin-sticker cyan">
                  <Check size={12} strokeWidth={3} /> +{batch.added} ADDED
                </span>
              </td>
              <td>
                {batch.duplicates > 0 ? (
                  <span className="admin-sticker yellow">
                    {batch.duplicates} DUPLICATES
                  </span>
                ) : (
                  <span className="font-mono text-xs text-neutral-400">0</span>
                )}
              </td>
              <td>
                {batch.invalid > 0 ? (
                  <span className="admin-sticker coral">
                    <AlertCircle size={12} strokeWidth={2.5} /> {batch.invalid} INVALID
                  </span>
                ) : (
                  <span className="font-mono text-xs text-neutral-400">0</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
