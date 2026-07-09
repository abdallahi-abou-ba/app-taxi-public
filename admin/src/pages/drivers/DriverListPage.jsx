import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { listDrivers } from '../../api/drivers';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'BLOCKED'];

const COLUMNS = [
  { key: 'fullName', label: 'Nom' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'vehiclePlate', label: 'Matricule' },
  { key: 'commissionRate', label: 'Commission', render: (r) => (r.commissionRate != null ? `${Math.round(r.commissionRate * 100)}%` : '—') },
  { key: 'approvalStatus', label: 'Statut', render: (r) => <StatusBadge status={r.approvalStatus} /> },
  { key: 'createdAt', label: 'Inscrit le', render: (r) => new Date(r.createdAt).toLocaleDateString('fr-FR') },
];

export default function DriverListPage() {
  const [status, setStatus] = useState('');
  const { data: drivers, loading, error } = useApi(() => listDrivers(status || undefined), [status]);

  return (
    <div>
      <div className="page-header">
        <h2>Chauffeurs</h2>
        <Link className="btn btn-primary" to="/drivers/new">
          + Ajouter un chauffeur
        </Link>
      </div>

      <div className="filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
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
          <DataTable columns={COLUMNS} rows={drivers} rowKey={(r) => r.id} linkTo={(r) => `/drivers/${r.id}`} />
        </div>
      )}
    </div>
  );
}
