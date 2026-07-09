import { useApi } from '../hooks/useApi';
import { getStats } from '../api/stats';
import StatCard from '../components/StatCard';

function formatCurrency(value) {
  return `${Math.round(value || 0).toLocaleString('fr-FR')} MRU`;
}

export default function DashboardPage() {
  const { data: stats, loading, error } = useApi(getStats, []);

  return (
    <div>
      <div className="page-header">
        <h2>Tableau de bord</h2>
      </div>

      {loading && <p className="hint">Chargement…</p>}
      {error && <p className="error">{error.message}</p>}

      {stats && (
        <>
          <div className="panel">
            <h3>Vue d'ensemble</h3>
            <div className="stats-grid">
              <StatCard label="Clients" value={stats.totalClients} />
              <StatCard label="Chauffeurs" value={stats.totalDrivers} />
              <StatCard label="En attente" value={stats.driversPending} to="/drivers?status=PENDING" />
              <StatCard label="Actifs" value={stats.driversApproved} />
              <StatCard label="Suspendus" value={stats.driversSuspended} />
              <StatCard label="Bloqués" value={stats.driversBlocked} />
            </div>
          </div>

          <div className="panel">
            <h3>Courses</h3>
            <div className="stats-grid">
              <StatCard label="Total courses" value={stats.totalRides} />
              <StatCard label="Terminées" value={stats.completedRides} />
              <StatCard label="Terminées aujourd'hui" value={stats.completedRidesToday} />
              {Object.entries(stats.ridesByStatus).map(([status, count]) => (
                <StatCard key={status} label={status} value={count} />
              ))}
            </div>
          </div>

          <div className="panel">
            <h3>Recettes et commissions</h3>
            <div className="stats-grid">
              <StatCard label="Recette totale" value={formatCurrency(stats.totalRevenue)} />
              <StatCard label="Commission société (total)" value={formatCurrency(stats.totalCommission)} />
              <StatCard label="Net chauffeurs (total)" value={formatCurrency(stats.totalDriverNet)} />
              <StatCard label="Recette ce mois" value={formatCurrency(stats.revenueThisMonth)} />
              <StatCard label="Commission ce mois" value={formatCurrency(stats.commissionThisMonth)} />
              <StatCard label="Net chauffeurs ce mois" value={formatCurrency(stats.driverNetThisMonth)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
