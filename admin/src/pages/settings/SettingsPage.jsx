import { useState } from 'react';
import { Percent, Phone } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { getSettings, updateSettings } from '../../api/settings';

export default function SettingsPage() {
  const { data: settings, loading, error, reload } = useApi(() => getSettings(), []);

  const [newRate, setNewRate] = useState('');
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const [newPhone, setNewPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);

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

  async function handlePhoneSubmit(e) {
    e.preventDefault();
    if (newPhone === '') return;
    setPhoneBusy(true);
    setPhoneError('');
    setPhoneSuccess(false);
    try {
      await updateSettings({ walletTopupPhone: newPhone });
      setNewPhone('');
      setPhoneSuccess(true);
      reload();
    } catch (err) {
      setPhoneError(err.message);
    } finally {
      setPhoneBusy(false);
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
          S'applique aux nouveaux chauffeurs à la création de leur compte. Ne modifie pas le taux des chauffeurs
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

      {phoneError && <p className="error">{phoneError}</p>}
      {phoneSuccess && <p className="hint">Numéro de recharge mis à jour.</p>}

      <div className="panel">
        <h3>
          <Phone size={16} />
          Numéro de recharge mobile money ({settings.walletTopupPhone || '—'})
        </h3>
        <p className="hint">
          Numéro affiché au client pour envoyer une recharge de compte par Bankily/Sedad/Masrivi/Click/Bimbank. Vide
          tant qu'aucun numéro n'est configuré.
        </p>
        <form className="form-grid" onSubmit={handlePhoneSubmit}>
          <label className="field">
            Nouveau numéro
            <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Ex : 22212345678" />
          </label>
          <div style={{ alignSelf: 'end' }}>
            <button className="btn btn-primary" type="submit" disabled={phoneBusy || newPhone === ''}>
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
