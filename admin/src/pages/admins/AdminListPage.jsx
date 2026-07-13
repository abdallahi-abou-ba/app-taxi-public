import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { listAdmins, createAdminUser, updateAdminRole } from '../../api/admins';
import DataTable from '../../components/DataTable';
import FormField from '../../components/FormField';
import { useAuth } from '../../context/AuthContext';

const ADMIN_ROLE_OPTIONS = ['SUPER_ADMIN', 'FINANCE', 'OPERATIONS', 'SUPPORT'];
const EMPTY = { email: '', password: '', fullName: '', phone: '', adminRole: 'OPERATIONS' };

export default function AdminListPage() {
  const { user: currentUser } = useAuth();
  const { data: admins, loading, error, reload } = useApi(() => listAdmins(), []);

  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      await createAdminUser(form);
      setForm(EMPTY);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(id, adminRole) {
    try {
      await updateAdminRole(id, adminRole);
      reload();
    } catch (err) {
      window.alert(err.message);
    }
  }

  const columns = [
    { key: 'fullName', label: 'Nom' },
    { key: 'email', label: 'E-mail' },
    {
      key: 'adminRole',
      label: 'Rôle',
      render: (r) =>
        r.id === currentUser.id ? (
          r.adminRole
        ) : (
          <select value={r.adminRole || ''} onChange={(e) => handleRoleChange(r.id, e.target.value)}>
            {ADMIN_ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        ),
    },
    { key: 'createdAt', label: 'Créé le', render: (r) => new Date(r.createdAt).toLocaleDateString('fr-FR') },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Administrateurs</h2>
      </div>

      <div className="panel">
        <h3>
          <UserPlus size={16} />
          Ajouter un administrateur
        </h3>
        {formError && <p className="error">{formError}</p>}
        <form className="form-grid" onSubmit={handleCreate}>
          <FormField label="Nom complet">
            <input type="text" required value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          </FormField>
          <FormField label="E-mail">
            <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </FormField>
          <FormField label="Mot de passe">
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </FormField>
          <FormField label="Téléphone">
            <input type="text" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </FormField>
          <FormField label="Rôle">
            <select value={form.adminRole} onChange={(e) => setForm((f) => ({ ...f, adminRole: e.target.value }))}>
              {ADMIN_ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </FormField>
          <div style={{ gridColumn: '1 / -1' }}>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>

      {loading && <p className="hint">Chargement…</p>}
      {error && <p className="error">{error.message}</p>}
      {admins && (
        <div className="panel">
          <DataTable columns={columns} rows={admins} rowKey={(r) => r.id} />
        </div>
      )}
    </div>
  );
}
