import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Archive, Car, UserCheck, History } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { archiveVehicle, assignVehicle, getVehicle, unassignVehicle } from '../../api/vehicles';
import { listDrivers } from '../../api/drivers';
import StatusBadge from '../../components/StatusBadge';

export default function VehicleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: vehicle, loading, error, reload } = useApi(() => getVehicle(id), [id]);
  const { data: drivers } = useApi(() => listDrivers('APPROVED'), []);

  const [selectedDriver, setSelectedDriver] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  async function handleAssign(e) {
    e.preventDefault();
    if (!selectedDriver) return;
    setBusy(true);
    setActionError('');
    try {
      await assignVehicle(id, selectedDriver);
      setSelectedDriver('');
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUnassign() {
    setBusy(true);
    setActionError('');
    try {
      await unassignVehicle(id);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    if (!window.confirm('Archiver ce véhicule ?')) return;
    setBusy(true);
    setActionError('');
    try {
      await archiveVehicle(id);
      navigate('/vehicles');
    } catch (err) {
      setActionError(err.message);
      setBusy(false);
    }
  }

  if (loading) return <p className="hint">Chargement…</p>;
  if (error) return <p className="error">{error.message}</p>;
  if (!vehicle) return null;

  return (
    <div>
      <Link className="back-link" to="/vehicles">
        <ArrowLeft size={13} strokeWidth={2.5} />
        Retour aux véhicules
      </Link>

      <div className="page-header">
        <h2>
          {vehicle.brand} {vehicle.model} ({vehicle.plate}) <StatusBadge status={vehicle.status} />
        </h2>
        <div className="btn-row">
          <Link className="btn btn-secondary" to={`/vehicles/${id}/edit`}>
            <Pencil size={13} strokeWidth={2.5} />
            Modifier
          </Link>
          <button className="btn btn-danger" onClick={handleArchive} disabled={busy}>
            <Archive size={13} strokeWidth={2.5} />
            Archiver
          </button>
        </div>
      </div>

      {actionError && <p className="error">{actionError}</p>}

      <div className="panel">
        <h3>
          <Car size={16} />
          Détails
        </h3>
        <div className="form-grid">
          <div>
            <strong>Propriétaire</strong>
            <div className="hint">{vehicle.ownerName || '—'}</div>
          </div>
          <div>
            <strong>Couleur</strong>
            <div className="hint">{vehicle.color || '—'}</div>
          </div>
          <div>
            <strong>Places</strong>
            <div className="hint">{vehicle.seatCount || '—'}</div>
          </div>
          <div>
            <strong>Type</strong>
            <div className="hint">{vehicle.type || '—'}</div>
          </div>
          <div>
            <strong>Assurance</strong>
            <div className="hint">
              {vehicle.insuranceProvider || '—'}
              {vehicle.insuranceExpiresAt ? ` (exp. ${new Date(vehicle.insuranceExpiresAt).toLocaleDateString('fr-FR')})` : ''}
            </div>
          </div>
          <div>
            <strong>Visite technique</strong>
            <div className="hint">
              {vehicle.technicalInspectionExpiresAt
                ? new Date(vehicle.technicalInspectionExpiresAt).toLocaleDateString('fr-FR')
                : '—'}
            </div>
          </div>
          <div>
            <strong>Carte grise</strong>
            <div className="hint">{vehicle.carteGriseNumber || '—'}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>
          <UserCheck size={16} />
          Chauffeur actuel
        </h3>
        {vehicle.currentDriver ? (
          <div className="btn-row" style={{ alignItems: 'center' }}>
            <Link className="link-row" to={`/drivers/${vehicle.currentDriver.id}`}>
              {vehicle.currentDriver.fullName}
            </Link>
            <button className="btn btn-secondary btn-sm" onClick={handleUnassign} disabled={busy}>
              Désaffecter
            </button>
          </div>
        ) : (
          <p className="hint">Aucun chauffeur affecté.</p>
        )}

        <form className="btn-row" style={{ marginTop: 12 }} onSubmit={handleAssign}>
          <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}>
            <option value="">Affecter à un chauffeur…</option>
            {(drivers || [])
              .filter((d) => d.id !== vehicle.currentDriverId)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
          </select>
          <button className="btn btn-primary" type="submit" disabled={busy || !selectedDriver}>
            Affecter
          </button>
        </form>
      </div>

      <div className="panel">
        <h3>
          <History size={16} />
          Historique d'affectation
        </h3>
        {vehicle.assignments && vehicle.assignments.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Chauffeur</th>
                  <th>Début</th>
                  <th>Fin</th>
                </tr>
              </thead>
              <tbody>
                {vehicle.assignments.map((a) => (
                  <tr key={a.id}>
                    <td>{a.driver?.fullName || '—'}</td>
                    <td>{new Date(a.startDate).toLocaleDateString('fr-FR')}</td>
                    <td>{a.endDate ? new Date(a.endDate).toLocaleDateString('fr-FR') : 'en cours'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="hint">Aucune affectation.</p>
        )}
      </div>
    </div>
  );
}
