import {
  Users,
  UserCheck,
  Clock3,
  CheckCircle2,
  PauseCircle,
  Ban,
  Route,
  CalendarCheck2,
  Wallet,
  HandCoins,
  Landmark,
  TrendingUp,
  CalendarClock,
  ThumbsUp,
  MapPin,
  PlayCircle,
  XCircle,
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { getStats } from '../api/stats';
import StatCard from '../components/StatCard';

function formatCurrency(value) {
  return `${Math.round(value || 0).toLocaleString('fr-FR')} MRU`;
}

// icon + tone for each dynamic ride-status breakdown tile - mirrors the
// semantics StatusBadge/index.css use for the same status strings elsewhere.
const RIDE_STATUS_META = {
  SCHEDULED: { icon: CalendarClock, tone: 'primary' },
  REQUESTED: { icon: Clock3, tone: 'warning' },
  ACCEPTED: { icon: ThumbsUp, tone: 'info' },
  ARRIVED: { icon: MapPin, tone: 'info' },
  IN_PROGRESS: { icon: PlayCircle, tone: 'info' },
  COMPLETED: { icon: CheckCircle2, tone: 'success' },
  CANCELLED: { icon: XCircle, tone: 'danger' },
};

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
            <h3>
              <Users size={16} />
              Vue d'ensemble
            </h3>
            <div className="stats-grid">
              <StatCard label="Clients" value={stats.totalClients} icon={Users} tone="info" />
              <StatCard label="Chauffeurs" value={stats.totalDrivers} icon={UserCheck} tone="neutral" />
              <StatCard label="En attente" value={stats.driversPending} to="/drivers?status=PENDING" icon={Clock3} tone="warning" />
              <StatCard label="Actifs" value={stats.driversApproved} icon={CheckCircle2} tone="success" />
              <StatCard label="Suspendus" value={stats.driversSuspended} icon={PauseCircle} tone="warning" />
              <StatCard label="Bloqués" value={stats.driversBlocked} icon={Ban} tone="danger" />
            </div>
          </div>

          <div className="panel">
            <h3>
              <Route size={16} />
              Courses
            </h3>
            <div className="stats-grid">
              <StatCard label="Total courses" value={stats.totalRides} icon={Route} tone="neutral" />
              <StatCard label="Terminées" value={stats.completedRides} icon={CheckCircle2} tone="success" />
              <StatCard label="Terminées aujourd'hui" value={stats.completedRidesToday} icon={CalendarCheck2} tone="info" />
              {Object.entries(stats.ridesByStatus).map(([status, count]) => {
                const meta = RIDE_STATUS_META[status] || { icon: Route, tone: 'neutral' };
                return <StatCard key={status} label={status} value={count} icon={meta.icon} tone={meta.tone} />;
              })}
            </div>
          </div>

          <div className="panel">
            <h3>
              <Wallet size={16} />
              Recettes et commissions
            </h3>
            <div className="stats-grid">
              <StatCard label="Recette totale" value={formatCurrency(stats.totalRevenue)} icon={Wallet} tone="primary" />
              <StatCard label="Commission société (total)" value={formatCurrency(stats.totalCommission)} icon={Landmark} tone="info" />
              <StatCard label="Net chauffeurs (total)" value={formatCurrency(stats.totalDriverNet)} icon={HandCoins} tone="success" />
              <StatCard label="Recette ce mois" value={formatCurrency(stats.revenueThisMonth)} icon={TrendingUp} tone="primary" />
              <StatCard label="Commission ce mois" value={formatCurrency(stats.commissionThisMonth)} icon={Landmark} tone="info" />
              <StatCard label="Net chauffeurs ce mois" value={formatCurrency(stats.driverNetThisMonth)} icon={HandCoins} tone="success" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
