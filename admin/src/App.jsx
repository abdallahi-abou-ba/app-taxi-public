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
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
