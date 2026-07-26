import { useState } from 'react';
import { Percent, Wallet } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { getSettings, updateSettings } from '../../api/settings';

export default function SettingsPage() {
  const { data: settings, loading, error, reload } = useApi(() => getSettings(), []);

  const [newRate, setNewRate] = useState('');
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const [newMinBalance, setNewMinBalance] = useState('');
  const [minBalanceError, setMinBalanceError] = useState('');
  const [minBalanceSuccess, setMinBalanceSuccess] = useState(false);
  const [minBalanceBusy, setMinBalanceBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (newRate === '') return;
    setBusy(true);
    setActionError('');
    setSuccess(false);
    try {
      await updateSettings({ defaultCommissionRate: Number(newRate) / 100 });
      setNewRate('');
      setSuccess(true);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleMinBalanceSubmit(e) {
    e.preventDefault();
    if (newMinBalance === '') return;
    setMinBalanceBusy(true);
    setMinBalanceError('');
    setMinBalanceSuccess(false);
    try {
      await updateSettings({ minBalanceToGoOnline: Number(newMinBalance) });
      setNewMinBalance('');
      setMinBalanceSuccess(true);
      reload();
    } catch (err) {
      setMinBalanceError(err.message);
    } finally {
      setMinBalanceBusy(false);
    }
  }

  if (loading) return <p className="hint">Chargement…</p>;
  if (error) return <p className="error">{error.message}</p>;

  return (
    <div>
      <div className="page-header">
        <h2>Paramètres</h2>
      </div>

      {actionError && <p className="error">{actionError}</p>}
      {success && <p className="hint">Taux de commission par défaut mis à jour.</p>}

      <div className="panel">
        <h3>
          <Percent size={16} />
          Commission par défaut (
          {settings.defaultCommissionRate != null ? `${Math.round(settings.defaultCommissionRate * 100)}%` : '—'})
        </h3>
        <p className="hint">
          S'applique aux nouveaux capitaines à la création de leur compte. Ne modifie pas le taux des capitaines
          existants ni les courses déjà terminées.
        </p>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            Nouveau taux par défaut (%)
            <input type="number" min="0" max="100" step="0.1" value={newRate} onChange={(e) => setNewRate(e.target.value)} />
          </label>
          <div style={{ alignSelf: 'end' }}>
            <button className="btn btn-primary" type="submit" disabled={busy || newRate === ''}>
              Enregistrer
            </button>
          </div>
        </form>
      </div>

      {minBalanceError && <p className="error">{minBalanceError}</p>}
      {minBalanceSuccess && <p className="hint">Solde minimum mis à jour.</p>}

      <div className="panel">
        <h3>
          <Wallet size={16} />
          Solde minimum pour passer en ligne ({settings.minBalanceToGoOnline ?? '—'} MRU)
        </h3>
        <p className="hint">
          Un capitaine dont le solde rechargé est en dessous de ce montant ne peut pas passer en ligne ni accepter de
          course.
        </p>
        <form className="form-grid" onSubmit={handleMinBalanceSubmit}>
          <label className="field">
            Nouveau solde minimum (MRU)
            <input
              type="number"
              min="0"
              step="1"
              value={newMinBalance}
              onChange={(e) => setNewMinBalance(e.target.value)}
            />
          </label>
          <div style={{ alignSelf: 'end' }}>
            <button className="btn btn-primary" type="submit" disabled={minBalanceBusy || newMinBalance === ''}>
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
