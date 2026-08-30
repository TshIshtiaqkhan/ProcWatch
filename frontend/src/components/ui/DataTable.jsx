export function DataTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#27272a]">
            {headers.map((h) => (
              <th
                key={h}
                className="text-left py-2.5 px-3 text-[#a1a1aa] font-semibold uppercase tracking-wider text-[11px]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-white/[0.04] last:border-none ${i % 2 === 0 ? "bg-white/[0.015]" : ""}`}>
              {row.map((cell, j) => (
                <td key={j} className="py-2.5 px-3 text-[#f4f4f5]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
