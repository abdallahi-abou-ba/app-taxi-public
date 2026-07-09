import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createExpense } from '../../api/expenses';
import FormField from '../../components/FormField';

const CATEGORY_OPTIONS = ['FUEL', 'MAINTENANCE', 'INSURANCE', 'SALARY', 'RENT', 'OTHER'];

const EMPTY = { category: 'FUEL', amount: '', description: '', expenseDate: '', receiptUrl: '' };

export default function ExpenseFormPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = { ...form, amount: Number(form.amount) };
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
        ← Retour
      </Link>
      <div className="page-header">
        <h2>Ajouter une dépense</h2>
      </div>

      {error && <p className="error">{error}</p>}

      <form className="panel form-grid" onSubmit={handleSubmit}>
        <FormField label="Catégorie">
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
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
