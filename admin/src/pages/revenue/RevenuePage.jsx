import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { getRevenue } from '../../api/revenue';
import DataTable from '../../components/DataTable';

function formatCurrency(value) {
  return `${Math.round(value || 0).toLocaleString('fr-FR')} MRU`;
}

const DRIVER_COLUMNS = [
  { key: 'driverName', label: 'Chauffeur' },
  { key: 'rideCount', label: 'Courses' },
  { key: 'grossRevenue', label: 'Recette brute', render: (r) => formatCurrency(r.grossRevenue) },
  { key: 'commission', label: 'Commission', render: (r) => formatCurrency(r.commission) },
  { key: 'driverNet', label: 'Net chauffeur', render: (r) => formatCurrency(r.driverNet) },
];

const PERIOD_COLUMNS = [
  { key: 'bucket', label: 'Période', render: (r) => new Date(r.bucket).toLocaleDateString('fr-FR') },
  { key: 'rideCount', label: 'Courses' },
  { key: 'grossRevenue', label: 'Recette brute', render: (r) => formatCurrency(r.grossRevenue) },
  { key: 'commission', label: 'Commission', render: (r) => formatCurrency(r.commission) },
  { key: 'driverNet', label: 'Net chauffeur', render: (r) => formatCurrency(r.driverNet) },
];

export default function RevenuePage() {
  const [groupBy, setGroupBy] = useState('driver');
  const { data: rows, loading, error } = useApi(() => getRevenue({ groupBy }), [groupBy]);

  return (
    <div>
      <div className="page-header">
        <h2>Recettes</h2>
      </div>

      <div className="filters">
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
          <option value="driver">Par chauffeur</option>
          <option value="day">Par jour</option>
          <option value="week">Par semaine</option>
          <option value="month">Par mois</option>
        </select>
      </div>

      {loading && <p className="hint">Chargement…</p>}
      {error && <p className="error">{error.message}</p>}
      {rows && (
        <div className="panel">
          <DataTable
            columns={groupBy === 'driver' ? DRIVER_COLUMNS : PERIOD_COLUMNS}
            rows={rows}
            rowKey={(r) => r.driverId || r.bucket}
          />
        </div>
      )}
    </div>
  );
}
