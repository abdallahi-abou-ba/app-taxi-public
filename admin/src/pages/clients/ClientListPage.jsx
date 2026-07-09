import { useApi } from '../../hooks/useApi';
import { listClients } from '../../api/clients';
import DataTable from '../../components/DataTable';

const COLUMNS = [
  { key: 'fullName', label: 'Nom' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'createdAt', label: 'Inscrit le', render: (r) => new Date(r.createdAt).toLocaleDateString('fr-FR') },
];

export default function ClientListPage() {
  const { data: clients, loading, error } = useApi(listClients, []);

  return (
    <div>
      <div className="page-header">
        <h2>Clients</h2>
      </div>

      {loading && <p className="hint">Chargement…</p>}
      {error && <p className="error">{error.message}</p>}
      {clients && (
        <div className="panel">
          <DataTable columns={COLUMNS} rows={clients} rowKey={(r) => r.id} />
        </div>
      )}
    </div>
  );
}
