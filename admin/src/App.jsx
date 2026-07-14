import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DriverListPage from './pages/drivers/DriverListPage';
import DriverDetailPage from './pages/drivers/DriverDetailPage';
import DriverFormPage from './pages/drivers/DriverFormPage';
import VehicleListPage from './pages/vehicles/VehicleListPage';
import VehicleDetailPage from './pages/vehicles/VehicleDetailPage';
import VehicleFormPage from './pages/vehicles/VehicleFormPage';
import RideListPage from './pages/rides/RideListPage';
import RideDetailPage from './pages/rides/RideDetailPage';
import RevenuePage from './pages/revenue/RevenuePage';
import ClientListPage from './pages/clients/ClientListPage';
import ExpenseListPage from './pages/expenses/ExpenseListPage';
import ExpenseFormPage from './pages/expenses/ExpenseFormPage';
import SettlementListPage from './pages/settlements/SettlementListPage';
import WalletTopUpListPage from './pages/wallet-topups/WalletTopUpListPage';
import ComplaintListPage from './pages/complaints/ComplaintListPage';
import ComplaintDetailPage from './pages/complaints/ComplaintDetailPage';
import ReportsPage from './pages/reports/ReportsPage';
import ActivityLogPage from './pages/ActivityLogPage';
import AdminListPage from './pages/admins/AdminListPage';
import SettingsPage from './pages/settings/SettingsPage';

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/drivers" element={<DriverListPage />} />
              <Route path="/drivers/new" element={<DriverFormPage />} />
              <Route path="/drivers/:id" element={<DriverDetailPage />} />
              <Route path="/drivers/:id/edit" element={<DriverFormPage />} />
              <Route path="/vehicles" element={<VehicleListPage />} />
              <Route path="/vehicles/new" element={<VehicleFormPage />} />
              <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
              <Route path="/vehicles/:id/edit" element={<VehicleFormPage />} />
              <Route path="/rides" element={<RideListPage />} />
              <Route path="/rides/:id" element={<RideDetailPage />} />
              <Route path="/revenue" element={<RevenuePage />} />
              <Route path="/clients" element={<ClientListPage />} />
              <Route path="/expenses" element={<ExpenseListPage />} />
              <Route path="/expenses/new" element={<ExpenseFormPage />} />
              <Route path="/settlements" element={<SettlementListPage />} />
              <Route path="/wallet-topups" element={<WalletTopUpListPage />} />
              <Route path="/complaints" element={<ComplaintListPage />} />
              <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/activity-log" element={<ActivityLogPage />} />
              <Route path="/admins" element={<AdminListPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
