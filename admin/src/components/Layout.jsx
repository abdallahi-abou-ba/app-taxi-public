import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Car,
  Route,
  Wallet,
  Receipt,
  HandCoins,
  WalletCards,
  FileBarChart,
  MessageSquareWarning,
  UserCircle,
  ShieldCheck,
  History,
  LogOut,
  CarTaxiFront,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../permissions';

const NAV_ITEMS = [
  { to: '/', label: 'Tableau de bord', end: true, icon: LayoutDashboard },
  { to: '/drivers', label: 'Chauffeurs', permission: ['DRIVERS'], icon: Users },
  { to: '/vehicles', label: 'Véhicules', permission: ['VEHICLES'], icon: Car },
  { to: '/rides', label: 'Courses', permission: ['RIDES'], icon: Route },
  { to: '/revenue', label: 'Recettes', permission: ['REVENUE'], icon: Wallet },
  { to: '/expenses', label: 'Dépenses', permission: ['EXPENSES'], icon: Receipt },
  { to: '/settlements', label: 'Règlements', permission: ['SETTLEMENTS'], icon: HandCoins },
  { to: '/wallet-topups', label: 'Recharges', permission: ['WALLET_TOPUPS'], icon: WalletCards },
  { to: '/reports', label: 'Rapports', permission: ['REPORTS'], icon: FileBarChart },
  { to: '/complaints', label: 'Réclamations', permission: ['COMPLAINTS'], icon: MessageSquareWarning },
  { to: '/clients', label: 'Clients', permission: ['CLIENTS'], icon: UserCircle },
  { to: '/admins', label: 'Administrateurs', permission: ['ADMINS'], icon: ShieldCheck },
  { to: '/activity-log', label: "Journal d'activité", permission: ['ACTIVITY_LOG'], icon: History },
  { to: '/settings', label: 'Paramètres', permission: ['SETTINGS'], icon: Settings },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || hasPermission(user, ...item.permission));
  const initial = user?.fullName?.trim()?.[0]?.toUpperCase() || '?';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <CarTaxiFront size={18} strokeWidth={2.25} />
          </div>
          <h1>Taxi MVP Admin</h1>
        </div>
        <nav>
          {visibleItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <item.icon size={16} strokeWidth={2.25} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initial}</div>
            <div className="sidebar-user-name">{user?.fullName}</div>
          </div>
          <button className="btn btn-secondary" onClick={logout} style={{ width: '100%', justifyContent: 'center' }}>
            <LogOut size={14} strokeWidth={2.25} />
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
