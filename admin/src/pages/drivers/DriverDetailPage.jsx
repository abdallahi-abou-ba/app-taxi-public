import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import {
  archiveDriver,
  getCommissionHistory,
  getDriver,
  setCommissionRate,
  setDriverStatus,
  viewDriverDocument,
} from '../../api/drivers';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'BLOCKED'];

const DOCUMENT_TYPES = [
  { type: 'PHOTO', label: 'Photo' },
  { type: 'ID_CARD', label: "Pièce d'identité" },
  { type: 'LICENSE', label: 'Permis de conduire' },
];

function formatCurrency(value) {
  return `${Math.round(value || 0).toLocaleString('fr-FR')} MRU`;
}

export default function DriverDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: driver, loading, error, reload } = useApi(() => getDriver(id), [id]);
  const { data: history, reload: reloadHistory } = useApi(() => getCommissionHistory(id), [id]);

  const [newStatus, setNewStatus] = useState('');
  const [newRate, setNewRate] = useState('');
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [viewingType, setViewingType] = useState(null);

  async function handleStatusChange(e) {
    e.preventDefault();
    if (!newStatus) return;
    setBusy(true);
    setActionError('');
    try {
      await setDriverStatus(id, newStatus);
      setNewStatus('');
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickStatus(status) {
    setBusy(true);
    setActionError('');
    try {
      await setDriverStatus(id, status);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRateChange(e) {
    e.preventDefault();
    if (newRate === '') return;
    setBusy(true);
    setActionError('');
    try {
      await setCommissionRate(id, Number(newRate) / 100, reason || undefined);
      setNewRate('');
      setReason('');
      reload();
      reloadHistory();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleViewDocument(type) {
    setViewingType(type);
    setActionError('');
    try {
      await viewDriverDocument(id, type);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setViewingType(null);
    }
  }

  async function handleArchive() {
    if (!window.confirm('Archiver ce chauffeur ?')) return;
    setBusy(true);
    setActionError('');
    try {
      await archiveDriver(id);
      navigate('/drivers');
    } catch (err) {
      setActionError(err.message);
      setBusy(false);
    }
  }

  if (loading) return <p className="hint">Chargement…</p>;
  if (error) return <p className="error">{error.message}</p>;
  if (!driver) return null;

  return (
    <div>
      <Link className="back-link" to="/drivers">
        ← Retour aux chauffeurs
      </Link>

      <div className="page-header">
        <h2>
          {driver.fullName} <StatusBadge status={driver.approvalStatus} />
        </h2>
        <div className="btn-row">
          <Link className="btn btn-secondary" to={`/drivers/${id}/edit`}>
            Modifier
          </Link>
          <button className="btn btn-danger" onClick={handleArchive} disabled={busy}>
            Archiver
          </button>
        </div>
      </div>

      {actionError && <p className="error">{actionError}</p>}

      <div className="panel">
        <h3>Profil</h3>
        <div className="form-grid">
          <div>
            <strong>E-mail</strong>
            <div className="hint">{driver.email}</div>
          </div>
          <div>
            <strong>Téléphone</strong>
            <div className="hint">{driver.phone || '—'}</div>
          </div>
          <div>
            <strong>WhatsApp</strong>
            <div className="hint">{driver.whatsapp || driver.phone || '—'}</div>
          </div>
          <div>
            <strong>Véhicule</strong>
            <div className="hint">
              {driver.vehiclePlate || '—'} {driver.vehicleModel}
            </div>
          </div>
          <div>
            <strong>Adresse</strong>
            <div className="hint">{driver.address || '—'}</div>
          </div>
          <div>
            <strong>N° pièce d'identité</strong>
            <div className="hint">{driver.nationalId || '—'}</div>
          </div>
          <div>
            <strong>Permis</strong>
            <div className="hint">
              {driver.licenseNumber || '—'}
              {driver.licenseExpiryAt ? ` (exp. ${new Date(driver.licenseExpiryAt).toLocaleDateString('fr-FR')})` : ''}
            </div>
          </div>
          <div>
            <strong>Type de contrat</strong>
            <div className="hint">{driver.contractType || '—'}</div>
          </div>
          <div>
            <strong>Solde</strong>
            <div className="hint">{formatCurrency(driver.creditBalance)}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Documents</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {DOCUMENT_TYPES.map(({ type, label }) => {
                const doc = driver.documents?.find((d) => d.type === type);
                return (
                  <tr key={type}>
                    <td>{label}</td>
                    <td>
                      {doc ? (
                        `Fourni le ${new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}`
                      ) : (
                        <span className="status-badge status-UNAVAILABLE">Manquant</span>
                      )}
                    </td>
                    <td>
                      {doc && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={viewingType === type}
                          onClick={() => handleViewDocument(type)}
                        >
                          Voir
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3>Statistiques</h3>
        <div className="stats-grid">
          <StatCard label="Courses terminées" value={driver.stats.completedRides} />
          <StatCard label="Courses annulées" value={driver.stats.cancelledRides} />
          <StatCard label="Recette totale" value={formatCurrency(driver.stats.totalRevenue)} />
          <StatCard label="Commission société" value={formatCurrency(driver.stats.totalCommission)} />
          <StatCard label="Net chauffeur" value={formatCurrency(driver.stats.totalNetEarnings)} />
        </div>
      </div>

      <div className={`panel${driver.approvalStatus === 'PENDING' ? ' panel-pending' : ''}`}>
        <h3>Statut</h3>
        {driver.approvalStatus === 'PENDING' ? (
          <>
            <p className="hint">Nouvelle inscription en attente de validation. Vérifiez le profil ci-dessus avant de statuer.</p>
            <div className="btn-row">
              <button className="btn btn-approve" onClick={() => handleQuickStatus('APPROVED')} disabled={busy}>
                ✓ Approuver le chauffeur
              </button>
              <button className="btn btn-reject" onClick={() => handleQuickStatus('REJECTED')} disabled={busy}>
                ✕ Rejeter la demande
              </button>
            </div>
          </>
        ) : (
          <form className="btn-row" onSubmit={handleStatusChange}>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="">Changer le statut…</option>
              {STATUS_OPTIONS.filter((s) => s !== driver.approvalStatus).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" type="submit" disabled={busy || !newStatus}>
              Appliquer
            </button>
          </form>
        )}
      </div>

      <div className="panel">
        <h3>Commission ({driver.commissionRate != null ? `${Math.round(driver.commissionRate * 100)}%` : '—'})</h3>
        <form className="form-grid" onSubmit={handleRateChange}>
          <label className="field">
            Nouveau taux (%)
            <input type="number" min="0" max="100" step="0.1" value={newRate} onChange={(e) => setNewRate(e.target.value)} />
          </label>
          <label className="field">
            Motif (optionnel)
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <div style={{ alignSelf: 'end' }}>
            <button className="btn btn-primary" type="submit" disabled={busy || newRate === ''}>
              Modifier la commission
            </button>
          </div>
        </form>

        {history && history.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Ancien taux</th>
                  <th>Nouveau taux</th>
                  <th>Motif</th>
                  <th>Modifié par</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{new Date(h.changedAt).toLocaleString('fr-FR')}</td>
                    <td>{h.oldRate != null ? `${Math.round(h.oldRate * 100)}%` : '—'}</td>
                    <td>{Math.round(h.newRate * 100)}%</td>
                    <td>{h.reason || '—'}</td>
                    <td>{h.changedByUser?.fullName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
