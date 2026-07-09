import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { listExpenses, deleteExpense } from '../../api/expenses';
import DataTable from '../../components/DataTable';
import { EXPENSE_CATEGORY_GROUPS } from '../../expenseConstants';

function formatCurrency(value) {
  return `${Math.round(value || 0).toLocaleString('fr-FR')} MRU`;
}

export default function ExpenseListPage() {
  const [category, setCategory] = useState('');
  const { data: expenses, meta, loading, error, reload } = useApi(
    () => listExpenses({ category: category || undefined }),
    [category]
  );

  async function handleDelete(id) {
    if (!window.confirm('Supprimer cette dépense ?')) return;
    await deleteExpense(id);
    reload();
  }

  const columns = [
    { key: 'expenseDate', label: 'Date', render: (r) => new Date(r.expenseDate).toLocaleDateString('fr-FR') },
    { key: 'category', label: 'Catégorie' },
    { key: 'amount', label: 'Montant', render: (r) => formatCurrency(r.amount) },
    { key: 'description', label: 'Description' },
    { key: 'vehicle', label: 'Véhicule', render: (r) => r.vehicle?.plate || '—' },
    { key: 'driver', label: 'Chauffeur', render: (r) => r.driver?.fullName || '—' },
    {
      key: 'bearer',
      label: 'Supporté par',
      render: (r) => (r.bearer === 'SHARED' ? `SHARED (${formatCurrency(r.driverShareAmount)})` : r.bearer),
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}>
          Supprimer
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Dépenses</h2>
        <Link className="btn btn-primary" to="/expenses/new">
          + Ajouter une dépense
        </Link>
      </div>

      <div className="filters">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="hint">Chargement…</p>}
      {error && <p className="error">{error.message}</p>}
      {expenses && (
        <div className="panel">
          {meta && <p className="hint">Total : {formatCurrency(meta.totalAmount)}</p>}
          <DataTable columns={columns} rows={expenses} rowKey={(r) => r.id} />
        </div>
      )}
    </div>
  );
}
