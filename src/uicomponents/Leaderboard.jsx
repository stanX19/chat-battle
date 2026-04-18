import React from 'react';

const Leaderboard = ({ scores, onClose }) => {
  const rows = [...scores].sort((a, b) => b.score - a.score);

  return (
    <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-50 p-12">
      <h2 className="text-4xl font-black text-blue-500 mb-8 tracking-[0.5em]">OPERATOR_ARCHIVES</h2>
      <div className="w-full max-w-3xl border border-gray-800 bg-gray-900/20 p-8 rounded-2xl">
        <table className="w-full text-left">
          <thead className="text-gray-500 text-xs uppercase tracking-widest border-b border-gray-800">
            <tr>
              <th className="pb-4">Rank</th>
              <th className="pb-4">Operator</th>
              <th className="pb-4">Floor</th>
              <th className="pb-4">Score</th>
              <th className="pb-4">Cause</th>
              <th className="pb-4">Date</th>
            </tr>
          </thead>
          <tbody className="text-sm font-bold">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">NO_ARCHIVE_ENTRIES</td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={`${row.name}-${row.date}-${idx}`} className="border-b border-gray-900/50">
                  <td className="py-3 text-cyan-400">#{idx + 1}</td>
                  <td className="py-3">{row.name}</td>
                  <td className="py-3">{row.floor}</td>
                  <td className="py-3 text-emerald-300">{row.score}</td>
                  <td className="py-3 text-red-300">{row.cause}</td>
                  <td className="py-3 text-gray-500">{row.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <button onClick={onClose} className="mt-8 px-6 py-2 border border-blue-900 text-blue-500 font-bold hover:bg-blue-900/20">DISCONNECT_ARCHIVE</button>
    </div>
  );
};

export default Leaderboard;
