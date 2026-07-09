import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Tableau de bord', end: true },
  { to: '/drivers', label: 'Chauffeurs' },
  { to: '/vehicles', label: 'Véhicules' },
  { to: '/rides', label: 'Courses' },
  { to: '/revenue', label: 'Recettes' },
  { to: '/clients', label: 'Clients' },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>Taxi MVP Admin</h1>
        <nav>
          {NAV_ITEMS.map((item) => (
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
