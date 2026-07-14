import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { listWalletTopUps, confirmWalletTopUp, cancelWalletTopUp } from '../../api/walletTopups';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { formatPaymentMethod } from '../../paymentConstants';

function formatCurrency(value) {
  return `${Math.round(value || 0).toLocaleString('fr-FR')} MRU`;
}

export default function WalletTopUpListPage() {
  const [status, setStatus] = useState('');
  const { data: topUps, loading, error, reload } = useApi(
    () => listWalletTopUps({ status: status || undefined }),
    [status]
  );

  async function handleConfirm(id) {
    if (!window.confirm('Confirmer cette recharge et créditer le solde du chauffeur ?')) return;
    await confirmWalletTopUp(id);
    reload();
  }

  async function handleCancel(id) {
    if (!window.confirm('Annuler cette recharge ?')) return;
    await cancelWalletTopUp(id);
    reload();
  }

  const columns = [
    { key: 'driver', label: 'Chauffeur', render: (r) => r.driver?.fullName || '—' },
    { key: 'amount', label: 'Montant', render: (r) => formatCurrency(r.amount) },
    { key: 'method', label: 'Application', render: (r) => formatPaymentMethod(r.method) },
    { key: 'payerPhone', label: 'Numéro utilisé', render: (r) => r.payerPhone || '—' },
    { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'declaredAt',
      label: 'Déclarée le',
      render: (r) => (r.driverDeclaredAt ? new Date(r.driverDeclaredAt).toLocaleString('fr-FR') : '—'),
    },
    {
      key: 'confirmedBy',
      label: 'Confirmée par',
      render: (r) => (r.confirmedByUser ? `${r.confirmedByUser.fullName} · ${new Date(r.confirmedAt).toLocaleDateString('fr-FR')}` : '—'),
    },
    {
      key: 'actions',
      label: '',
      render: (r) =>
        r.status === 'PENDING' ? (
          <div className="btn-row">
            <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); handleConfirm(r.id); }}>
              <Check size={12} strokeWidth={2.75} />
              Confirmer
            </button>
            <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); handleCancel(r.id); }}>
              <X size={12} strokeWidth={2.75} />
              Annuler
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Recharges de compte</h2>
      </div>

      <p className="hint">
        Le chauffeur paie le code marchand de l'entreprise via son application mobile money, puis le déclare ici -
        vérifiez la réception avant de confirmer, ce qui crédite son solde.
      </p>

      <div className="filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="PENDING">PENDING</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {loading && <p className="hint">Chargement…</p>}
      {error && <p className="error">{error.message}</p>}
      {topUps && (
        <div className="panel">
          <DataTable columns={columns} rows={topUps} rowKey={(r) => r.id} />
        </div>
      )}
    </div>
  );
}
