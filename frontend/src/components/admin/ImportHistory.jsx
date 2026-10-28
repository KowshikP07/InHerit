import { Clock3, FileSpreadsheet } from 'lucide-react'

export default function ImportHistory({ history }) {
  if (!history.length) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <FileSpreadsheet className="mx-auto text-slate-300" size={38} />
        <h3 className="mt-3 font-semibold text-slate-900">No import history</h3>
        <p className="mt-1 text-sm text-slate-500">Confirmed CSV batches will appear here.</p>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">File</th><th className="px-5 py-3">Imported</th><th className="px-5 py-3">Processed</th><th className="px-5 py-3">Added</th><th className="px-5 py-3">Duplicates</th><th className="px-5 py-3">Invalid</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((batch) => (
              <tr key={batch.id}>
                <td className="px-5 py-4"><span className="flex items-center gap-2 font-semibold text-slate-900"><FileSpreadsheet size={17} className="text-indigo-600" />{batch.filename}</span></td>
                <td className="px-5 py-4 text-slate-600"><span className="flex items-center gap-1.5"><Clock3 size={15} />{new Date(batch.importedAt).toLocaleString()}</span></td>
                <td className="px-5 py-4">{batch.totalRows}</td><td className="px-5 py-4 font-semibold text-emerald-600">+{batch.added}</td>
                <td className="px-5 py-4 text-amber-700">{batch.duplicates ?? 0}</td><td className="px-5 py-4 text-rose-700">{batch.invalid ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
