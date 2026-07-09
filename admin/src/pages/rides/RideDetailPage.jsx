import { Link, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { getRide } from '../../api/rides';
import StatusBadge from '../../components/StatusBadge';

function formatCurrency(value) {
  return value != null ? `${Math.round(value).toLocaleString('fr-FR')} MRU` : '—';
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('fr-FR') : '—';
}

export default function RideDetailPage() {
  const { id } = useParams();
  const { data: ride, loading, error } = useApi(() => getRide(id), [id]);

  if (loading) return <p className="hint">Chargement…</p>;
  if (error) return <p className="error">{error.message}</p>;
  if (!ride) return null;

  return (
    <div>
      <Link className="back-link" to="/rides">
        ← Retour aux courses
      </Link>

      <div className="page-header">
        <h2>
          Course {ride.id.slice(0, 8)} <StatusBadge status={ride.status} />
        </h2>
      </div>

      <div className="panel">
        <h3>Trajet</h3>
        <div className="form-grid">
          <div>
            <strong>Client</strong>
            <div className="hint">{ride.client?.fullName || '—'}</div>
          </div>
          <div>
            <strong>Chauffeur</strong>
            <div className="hint">
              {ride.driver ? (
                <Link className="link-row" to={`/drivers/${ride.driver.id}`}>
                  {ride.driver.fullName}
                </Link>
              ) : (
                '—'
              )}
            </div>
          </div>
          <div>
            <strong>Départ</strong>
            <div className="hint">{ride.pickupAddress || `${ride.pickupLat}, ${ride.pickupLng}`}</div>
          </div>
          <div>
            <strong>Destination</strong>
            <div className="hint">{ride.destinationAddress || `${ride.destinationLat}, ${ride.destinationLng}`}</div>
          </div>
          <div>
            <strong>Distance</strong>
            <div className="hint">{ride.distanceKm ? `${ride.distanceKm.toFixed(1)} km` : '—'}</div>
          </div>
          <div>
            <strong>Durée</strong>
            <div className="hint">{ride.durationMin ? `${Math.round(ride.durationMin)} min` : '—'}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Horodatage</h3>
        <div className="form-grid">
          <div>
            <strong>Demandée</strong>
            <div className="hint">{formatDate(ride.requestedAt)}</div>
          </div>
          <div>
            <strong>Acceptée</strong>
            <div className="hint">{formatDate(ride.acceptedAt)}</div>
          </div>
          <div>
            <strong>Arrivée</strong>
            <div className="hint">{formatDate(ride.arrivedAt)}</div>
          </div>
          <div>
            <strong>Démarrée</strong>
            <div className="hint">{formatDate(ride.startedAt)}</div>
          </div>
          <div>
            <strong>Terminée</strong>
            <div className="hint">{formatDate(ride.completedAt)}</div>
          </div>
          <div>
            <strong>Annulée</strong>
            <div className="hint">
              {ride.cancelledAt ? `${formatDate(ride.cancelledAt)} (${ride.cancelledBy})` : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Paiement et commission</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{formatCurrency(ride.estimatedFare)}</div>
            <div className="stat-label">Prix</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{ride.paymentMethod}</div>
            <div className="stat-label">{ride.isPaid ? 'Payé' : 'Non payé'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {ride.commissionRateSnapshot != null ? `${Math.round(ride.commissionRateSnapshot * 100)}%` : '—'}
            </div>
            <div className="stat-label">Taux de commission (figé)</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatCurrency(ride.commissionAmount)}</div>
            <div className="stat-label">Commission société</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatCurrency(ride.driverNetAmount)}</div>
            <div className="stat-label">Net chauffeur</div>
          </div>
          {ride.creditApplied > 0 && (
            <div className="stat-card">
              <div className="stat-value">{formatCurrency(ride.creditApplied)}</div>
              <div className="stat-label">Crédit appliqué</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
