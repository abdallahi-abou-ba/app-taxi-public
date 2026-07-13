import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { listVehicles } from '../../api/vehicles';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';

const STATUS_OPTIONS = ['ACTIVE', 'MAINTENANCE', 'SUSPENDED', 'UNAVAILABLE', 'ARCHIVED'];

const COLUMNS = [
  { key: 'plate', label: 'Matricule' },
  { key: 'brand', label: 'Marque' },
  { key: 'model', label: 'Modèle' },
  { key: 'year', label: 'Année' },
  { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
  { key: 'currentDriver', label: 'Chauffeur', render: (r) => r.currentDriver?.fullName || '—' },
];

export default function VehicleListPage() {
  const [status, setStatus] = useState('');
  const { data: vehicles, loading, error } = useApi(() => listVehicles({ status: status || undefined }), [status]);

  return (
    <div>
      <div className="page-header">
        <h2>Véhicules</h2>
        <Link className="btn btn-primary" to="/vehicles/new">
          <Plus size={14} strokeWidth={2.75} />
          Ajouter un véhicule
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
      {vehicles && (
        <div className="panel">
          <DataTable columns={COLUMNS} rows={vehicles} rowKey={(r) => r.id} linkTo={(r) => `/vehicles/${r.id}`} />
        </div>
      )}
    </div>
  );
}
