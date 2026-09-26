import { FC } from 'react';

interface Props {
  headers: string[];
  rows: string[][];
}

function cleanCell(cell: string): { isBold: boolean; text: string } {
  const isBold = cell.startsWith('**') && cell.endsWith('**');
  const text = cell.replace(/\*\*/g, '').trim();
  return { isBold, text };
}

export const AnalystTable: FC<Props> = ({ headers, rows }) => {
  if (headers.length === 0 || rows.length === 0) return null;

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-border-custom bg-surface shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="border-b border-border-custom bg-surface-2/60 text-2xs uppercase tracking-wider text-text-secondary font-bold">
            <tr>
              {headers.map((h, idx) => {
                const { text } = cleanCell(h);
                const isFirst = idx === 0;
                return (
                  <th
                    key={idx}
                    className={`py-3 px-4 ${isFirst ? 'text-left' : 'text-right'}`}
                  >
                    {text}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom/40">
            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="hover:bg-primary/5 transition-colors"
              >
                {row.map((cell, cIdx) => {
                  const { isBold, text } = cleanCell(cell);
                  const isFirst = cIdx === 0;
                  const isNumber = !isFirst && /^[0-9$+\-%.,\s]+(?:PLN|USD|mld|mln)?$/i.test(text);

                  return (
                    <td
                      key={cIdx}
                      className={`py-3 px-4 ${
                        isFirst
                          ? 'font-medium text-text-primary text-left'
                          : 'text-right'
                      } ${isNumber ? 'font-mono tabular-nums' : ''} ${
                        isBold ? 'font-bold text-text-primary' : 'text-text-secondary'
                      }`}
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
