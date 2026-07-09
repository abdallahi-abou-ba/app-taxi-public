import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { listComplaints } from '../../api/complaints';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const COLUMNS = [
  { key: 'createdAt', label: 'Date', render: (r) => new Date(r.createdAt).toLocaleDateString('fr-FR') },
  { key: 'category', label: 'Catégorie' },
  { key: 'submittedByUser', label: 'Soumis par', render: (r) => r.submittedByUser?.fullName || '—' },
  { key: 'aboutUser', label: 'Concerne', render: (r) => r.aboutUser?.fullName || '—' },
  { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
];

export default function ComplaintListPage() {
  const [status, setStatus] = useState('');
  const { data: complaints, loading, error } = useApi(() => listComplaints({ status: status || undefined }), [status]);

  return (
    <div>
      <div className="page-header">
        <h2>Réclamations</h2>
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
      {complaints && (
        <div className="panel">
          <DataTable columns={COLUMNS} rows={complaints} rowKey={(r) => r.id} linkTo={(r) => `/complaints/${r.id}`} />
        </div>
      )}
    </div>
  );
}
