import { useApi } from '../hooks/useApi';
import { listActivityLog } from '../api/activityLog';
import DataTable from '../components/DataTable';

const COLUMNS = [
  { key: 'createdAt', label: 'Date', render: (r) => new Date(r.createdAt).toLocaleString('fr-FR') },
  { key: 'adminUser', label: 'Administrateur', render: (r) => r.adminUser?.fullName || '—' },
  { key: 'action', label: 'Action' },
  { key: 'entityType', label: 'Entité' },
  { key: 'entityId', label: 'ID entité' },
  { key: 'details', label: 'Détails', render: (r) => (r.details ? JSON.stringify(r.details) : '—') },
];

export default function ActivityLogPage() {
  const { data: logs, loading, error } = useApi(() => listActivityLog({ pageSize: 100 }), []);

  return (
    <div>
      <div className="page-header">
        <h2>Journal d'activité</h2>
      </div>

      {loading && <p className="hint">Chargement…</p>}
      {error && <p className="error">{error.message}</p>}
      {logs && (
        <div className="panel">
          <DataTable columns={COLUMNS} rows={logs} rowKey={(r) => r.id} />
        </div>
      )}
    </div>
  );
}
