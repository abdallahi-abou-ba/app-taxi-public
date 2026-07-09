import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { listDrivers, setDriverStatus } from '../../api/drivers';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'BLOCKED'];

const BASE_COLUMNS = [
  { key: 'fullName', label: 'Nom' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'vehiclePlate', label: 'Matricule' },
  { key: 'commissionRate', label: 'Commission', render: (r) => (r.commissionRate != null ? `${Math.round(r.commissionRate * 100)}%` : '—') },
  { key: 'approvalStatus', label: 'Statut', render: (r) => <StatusBadge status={r.approvalStatus} /> },
  { key: 'createdAt', label: 'Inscrit le', render: (r) => new Date(r.createdAt).toLocaleDateString('fr-FR') },
];

export default function DriverListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || '';
  const { data: drivers, loading, error, reload } = useApi(() => listDrivers(status || undefined), [status]);
  const [busyId, setBusyId] = useState(null);

  function handleStatusFilterChange(e) {
    const value = e.target.value;
    setSearchParams(value ? { status: value } : {});
  }

  async function handleQuickAction(e, driverId, newStatus) {
    e.stopPropagation();
    setBusyId(driverId);
    try {
      await setDriverStatus(driverId, newStatus);
      reload();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    ...BASE_COLUMNS,
    {
      key: 'actions',
      label: '',
      render: (r) =>
        r.approvalStatus === 'PENDING' ? (
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-approve btn-sm"
              disabled={busyId === r.id}
              onClick={(e) => handleQuickAction(e, r.id, 'APPROVED')}
            >
              Approuver
            </button>
            <button
              type="button"
              className="btn btn-reject btn-sm"
              disabled={busyId === r.id}
              onClick={(e) => handleQuickAction(e, r.id, 'REJECTED')}
            >
              Rejeter
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Chauffeurs</h2>
        <Link className="btn btn-primary" to="/drivers/new">
          + Ajouter un chauffeur
        </Link>
      </div>

      <div className="filters">
        <select value={status} onChange={handleStatusFilterChange}>
          <option value="">Tous les statuts</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="hint">Chargement…</p>}
      {error && <p className="error">{error.message}</p>}
      {drivers && (
        <div className="panel">
          <DataTable columns={columns} rows={drivers} rowKey={(r) => r.id} linkTo={(r) => `/drivers/${r.id}`} />
        </div>
      )}
    </div>
  );
}
