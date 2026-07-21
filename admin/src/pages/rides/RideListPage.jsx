import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { listRides } from '../../api/rides';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { PAYMENT_METHOD_LABELS, formatPaymentMethod } from '../../paymentConstants';

const STATUS_OPTIONS = ['SCHEDULED', 'REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

function formatCurrency(value) {
  return value != null ? `${Math.round(value).toLocaleString('fr-FR')} MRU` : '—';
}

const COLUMNS = [
  { key: 'requestedAt', label: 'Demandée le', render: (r) => new Date(r.requestedAt).toLocaleString('fr-FR') },
  { key: 'client', label: 'Client', render: (r) => r.client?.fullName || '—' },
  { key: 'driver', label: 'Capitaine', render: (r) => r.driver?.fullName || '—' },
  { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
  { key: 'paymentMethod', label: 'Paiement', render: (r) => formatPaymentMethod(r.paymentMethod) },
  { key: 'estimatedFare', label: 'Prix', render: (r) => formatCurrency(r.estimatedFare) },
  { key: 'commissionAmount', label: 'Commission', render: (r) => formatCurrency(r.commissionAmount) },
];

export default function RideListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const {
    data: rides,
    meta,
    loading,
    error,
  } = useApi(
    () => listRides({ page, pageSize: 20, status: status || undefined, paymentMethod: paymentMethod || undefined }),
    [page, status, paymentMethod]
  );

  function updateFilter(setter) {
    return (e) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  return (
    <div>
      <div className="page-header">
        <h2>Courses</h2>
      </div>

      <div className="filters">
        <select value={status} onChange={updateFilter(setStatus)}>
          <option value="">Tous les statuts</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={paymentMethod} onChange={updateFilter(setPaymentMethod)}>
          <option value="">Tous les paiements</option>
          {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="hint">Chargement…</p>}
      {error && <p className="error">{error.message}</p>}
      {rides && (
        <div className="panel">
          <DataTable columns={COLUMNS} rows={rides} rowKey={(r) => r.id} linkTo={(r) => `/rides/${r.id}`} />
          {meta && (
            <div className="pagination">
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Précédent
              </button>
              <span>
                Page {meta.page} / {meta.totalPages || 1} ({meta.total} courses)
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
