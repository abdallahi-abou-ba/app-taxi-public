import { useState } from 'react';
import { exportRides, exportRevenue, exportExpenses } from '../../api/reports';
import FormField from '../../components/FormField';

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(today());
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  function range() {
    return { from: new Date(from).toISOString(), to: new Date(`${to}T23:59:59`).toISOString() };
  }

  async function handleExport(key, exportFn) {
    setBusy(key);
    setError('');
    try {
      await exportFn(range());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Rapports</h2>
      </div>

      <div className="panel">
        <div className="form-grid">
          <FormField label="Du">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </FormField>
          <FormField label="Au">
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </FormField>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" disabled={!!busy} onClick={() => handleExport('rides', exportRides)}>
            {busy === 'rides' ? 'Export…' : 'Exporter les courses (CSV)'}
          </button>
          <button className="btn btn-primary" disabled={!!busy} onClick={() => handleExport('revenue', exportRevenue)}>
            {busy === 'revenue' ? 'Export…' : 'Exporter les recettes (CSV)'}
          </button>
          <button className="btn btn-primary" disabled={!!busy} onClick={() => handleExport('expenses', exportExpenses)}>
            {busy === 'expenses' ? 'Export…' : 'Exporter les dépenses (CSV)'}
          </button>
        </div>
      </div>
    </div>
  );
}
