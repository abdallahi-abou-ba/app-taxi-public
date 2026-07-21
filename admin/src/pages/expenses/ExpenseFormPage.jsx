import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { createExpense } from '../../api/expenses';
import { listDrivers } from '../../api/drivers';
import { listVehicles } from '../../api/vehicles';
import { useApi } from '../../hooks/useApi';
import FormField from '../../components/FormField';
import { EXPENSE_CATEGORY_GROUPS, EXPENSE_BEARER_OPTIONS } from '../../expenseConstants';

const EMPTY = {
  category: 'FUEL',
  amount: '',
  description: '',
  expenseDate: '',
  receiptUrl: '',
  vehicleId: '',
  driverId: '',
  bearer: 'COMPANY',
  driverShareAmount: '',
};

export default function ExpenseFormPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { data: drivers } = useApi(() => listDrivers('APPROVED'), []);
  const { data: vehicles } = useApi(() => listVehicles({}), []);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (payload.driverShareAmount !== '') payload.driverShareAmount = Number(payload.driverShareAmount);
      for (const key of Object.keys(payload)) {
        if (payload[key] === '') delete payload[key];
      }
      await createExpense(payload);
      navigate('/expenses');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Link className="back-link" to="/expenses">
        <ArrowLeft size={13} strokeWidth={2.5} />
        Retour
      </Link>
      <div className="page-header">
        <h2>Ajouter une dépense</h2>
      </div>

      {error && <p className="error">{error}</p>}

      <form className="panel form-grid" onSubmit={handleSubmit}>
        <FormField label="Catégorie">
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {Object.entries(EXPENSE_CATEGORY_GROUPS).map(([groupKey, group]) => (
              <optgroup key={groupKey} label={group.label}>
                {group.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </FormField>
        <FormField label="Montant">
          <input type="number" step="0.01" required value={form.amount} onChange={(e) => set('amount', e.target.value)} />
        </FormField>
        <FormField label="Date">
          <input type="date" value={form.expenseDate} onChange={(e) => set('expenseDate', e.target.value)} />
        </FormField>
        <FormField label="Description">
          <input type="text" value={form.description} onChange={(e) => set('description', e.target.value)} />
        </FormField>
        <FormField label="Véhicule concerné">
          <select value={form.vehicleId} onChange={(e) => set('vehicleId', e.target.value)}>
            <option value="">Aucun</option>
            {(vehicles || []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.brand} {v.model} ({v.plate})
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Capitaine concerné">
          <select value={form.driverId} onChange={(e) => set('driverId', e.target.value)}>
            <option value="">Aucun</option>
            {(drivers || []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Supporté par">
          <select value={form.bearer} onChange={(e) => set('bearer', e.target.value)}>
            {EXPENSE_BEARER_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </FormField>
        {form.bearer === 'SHARED' && (
          <FormField label="Part du capitaine">
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={form.driverShareAmount}
              onChange={(e) => set('driverShareAmount', e.target.value)}
            />
          </FormField>
        )}
        <FormField label="URL du reçu">
          <input type="text" value={form.receiptUrl} onChange={(e) => set('receiptUrl', e.target.value)} />
        </FormField>

        <div style={{ gridColumn: '1 / -1' }}>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
