import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../permissions';

const NAV_ITEMS = [
  { to: '/', label: 'Tableau de bord', end: true },
  { to: '/drivers', label: 'Chauffeurs', permission: ['DRIVERS'] },
  { to: '/vehicles', label: 'Véhicules', permission: ['VEHICLES'] },
  { to: '/rides', label: 'Courses', permission: ['RIDES'] },
  { to: '/revenue', label: 'Recettes', permission: ['FINANCE'] },
  { to: '/expenses', label: 'Dépenses', permission: ['FINANCE'] },
  { to: '/settlements', label: 'Règlements', permission: ['FINANCE'] },
  { to: '/reports', label: 'Rapports', permission: ['FINANCE'] },
  { to: '/complaints', label: 'Réclamations', permission: ['COMPLAINTS'] },
  { to: '/clients', label: 'Clients', permission: ['CLIENTS'] },
  { to: '/admins', label: 'Administrateurs', permission: ['ADMINS'] },
  { to: '/activity-log', label: "Journal d'activité", permission: ['ACTIVITY_LOG'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || hasPermission(user, ...item.permission));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>Taxi MVP Admin</h1>
        <nav>
          {visibleItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="logout">
          <div className="hint" style={{ color: '#a8a8ad', marginBottom: 8 }}>
            {user?.fullName}
          </div>
          <button className="btn btn-secondary" onClick={logout}>
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
