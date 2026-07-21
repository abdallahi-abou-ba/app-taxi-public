import { useState } from 'react';
import { Sparkles, Check, X, Clock } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { listSettlements, generateSettlement, markSettlementPaid, cancelSettlement } from '../../api/settlements';
import { listDrivers } from '../../api/drivers';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import FormField from '../../components/FormField';
import { formatPaymentMethod } from '../../paymentConstants';

function formatCurrency(value) {
  return `${Math.round(value || 0).toLocaleString('fr-FR')} MRU`;
}

export default function SettlementListPage() {
  const [status, setStatus] = useState('');
  const { data: settlements, loading, error, reload } = useApi(
    () => listSettlements({ status: status || undefined }),
    [status]
  );
  const { data: drivers } = useApi(() => listDrivers('APPROVED'), []);

  const [form, setForm] = useState({ driverId: '', periodStart: '', periodEnd: '' });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleGenerate(e) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      await generateSettlement({
        driverId: form.driverId,
        periodStart: new Date(form.periodStart).toISOString(),
        periodEnd: new Date(form.periodEnd).toISOString(),
      });
      setForm({ driverId: '', periodStart: '', periodEnd: '' });
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePay(id) {
    if (!window.confirm('Marquer ce règlement comme payé ?')) return;
    await markSettlementPaid(id);
    reload();
  }

  async function handleCancel(id) {
    if (!window.confirm('Annuler ce règlement ?')) return;
    await cancelSettlement(id);
    reload();
  }

  const columns = [
    { key: 'driver', label: 'Capitaine', render: (r) => r.driver?.fullName || '—' },
    { key: 'periodStart', label: 'Début', render: (r) => new Date(r.periodStart).toLocaleDateString('fr-FR') },
    { key: 'periodEnd', label: 'Fin', render: (r) => new Date(r.periodEnd).toLocaleDateString('fr-FR') },
    { key: 'cashCommissionOwed', label: 'Commission due (cash)', render: (r) => formatCurrency(r.cashCommissionOwed) },
    { key: 'cardNetOwed', label: 'Net dû (carte)', render: (r) => formatCurrency(r.cardNetOwed) },
    { key: 'expensesOwed', label: 'Frais capitaine', render: (r) => formatCurrency(r.expensesOwed) },
    { key: 'netAmount', label: 'Solde net', render: (r) => formatCurrency(r.netAmount) },
    {
      key: 'creditApplied',
      label: 'Payé via solde',
      render: (r) => (r.creditApplied > 0 ? formatCurrency(r.creditApplied) : '—'),
    },
    { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'driverDeclared',
      label: 'Déclaration capitaine',
      render: (r) =>
        r.driverMarkedPaidAt ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5 }}>
            <Clock size={12} strokeWidth={2.5} />
            {formatPaymentMethod(r.driverPaymentMethod)} · {new Date(r.driverMarkedPaidAt).toLocaleDateString('fr-FR')}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'actions',
      label: '',
      render: (r) =>
        r.status === 'PENDING' ? (
          <div className="btn-row">
            <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); handlePay(r.id); }}>
              <Check size={12} strokeWidth={2.75} />
              Payer
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
        <h2>Règlements capitaines</h2>
      </div>

      <div className="panel">
        <h3>
          <Sparkles size={16} />
          Générer un règlement
        </h3>
        {formError && <p className="error">{formError}</p>}
        <form className="form-grid" onSubmit={handleGenerate}>
          <FormField label="Capitaine">
            <select required value={form.driverId} onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))}>
              <option value="">Choisir…</option>
              {(drivers || []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Début de période">
            <input
              type="date"
              required
              value={form.periodStart}
              onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
            />
          </FormField>
          <FormField label="Fin de période">
            <input
              type="date"
              required
              value={form.periodEnd}
              onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
            />
          </FormField>
          <div style={{ gridColumn: '1 / -1' }}>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Génération…' : 'Générer'}
            </button>
          </div>
        </form>
      </div>

      <div className="filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="PENDING">PENDING</option>
          <option value="PAID">PAID</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {loading && <p className="hint">Chargement…</p>}
      {error && <p className="error">{error.message}</p>}
      {settlements && (
        <div className="panel">
          <DataTable columns={columns} rows={settlements} rowKey={(r) => r.id} />
        </div>
      )}
    </div>
  );
}
