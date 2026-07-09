import { useNavigate } from 'react-router-dom';

// Generic list table: columns = [{ key, label, render?(row) }].
// If linkTo(row) is provided, clicking a row navigates there.
export default function DataTable({ columns, rows, rowKey, linkTo, emptyLabel = 'Aucun résultat.' }) {
  const navigate = useNavigate();

  if (!rows || rows.length === 0) {
    return <p className="hint">{emptyLabel}</p>;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const to = linkTo ? linkTo(row) : null;
            return (
              <tr
                key={rowKey(row)}
                onClick={to ? () => navigate(to) : undefined}
                style={to ? { cursor: 'pointer' } : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key}>{col.render ? col.render(row) : (row[col.key] ?? '—')}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
