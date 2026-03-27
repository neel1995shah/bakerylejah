import React from 'react';

export default function Table({ columns, data, emptyMessage = "No data found." }) {
  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-primary/5 border-b border-black/5">
                {columns.map((col, idx) => (
                  <th key={idx} className={`p-5 font-bold text-primary/60 text-xs uppercase tracking-widest ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-black/5 hover:bg-white/40 transition-colors group">
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className={`p-5 text-sm ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                        {col.render ? col.render(row) : <span className="text-primary/80">{row[col.accessor]}</span>}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="p-12 text-center text-primary/40 italic">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {data.length > 0 ? (
          data.map((row, rowIdx) => (
            <div key={rowIdx} className="glass-card p-6 space-y-4 transition-transform active:scale-[0.98]">
              {columns.map((col, colIdx) => (
                <div key={colIdx} className={`flex ${col.align === 'right' ? 'flex-col items-end' : col.align === 'center' ? 'flex-col items-center text-center' : 'justify-between items-start'} gap-1`}>
                  <span className="text-[10px] font-black uppercase tracking-tighter text-primary/30">
                    {col.header}
                  </span>
                  <div className="text-sm font-semibold">
                    {col.render ? col.render(row) : row[col.accessor]}
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="glass-card p-12 text-center text-primary/40 italic">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}
