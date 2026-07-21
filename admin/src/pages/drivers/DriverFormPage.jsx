import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { createDriver, getDriver, updateDriver } from '../../api/drivers';
import FormField from '../../components/FormField';

const CREATE_ONLY_FIELDS = ['email', 'password', 'initialBalance'];

const EMPTY = {
  email: '',
  password: '',
  fullName: '',
  phone: '',
  whatsapp: '',
  vehiclePlate: '',
  vehicleModel: '',
  address: '',
  nationalId: '',
  licenseNumber: '',
  licenseExpiryAt: '',
  contractType: '',
  initialBalance: '',
};

function toDateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

export default function DriverFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    getDriver(id)
      .then(({ data }) =>
        setForm({
          ...EMPTY,
          ...data,
          licenseExpiryAt: toDateInput(data.licenseExpiryAt),
        })
      )
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (isEdit) {
        const payload = { ...form };
        for (const field of CREATE_ONLY_FIELDS) delete payload[field];
        for (const key of Object.keys(payload)) {
          if (payload[key] === '') delete payload[key];
        }
        await updateDriver(id, payload);
        navigate(`/drivers/${id}`);
      } else {
        const payload = { ...form };
        if (payload.initialBalance === '') delete payload.initialBalance;
        else payload.initialBalance = Number(payload.initialBalance);
        if (!payload.licenseExpiryAt) delete payload.licenseExpiryAt;
        const { data } = await createDriver(payload);
        navigate(`/drivers/${data.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="hint">Chargement…</p>;

  return (
    <div>
      <Link className="back-link" to={isEdit ? `/drivers/${id}` : '/drivers'}>
        <ArrowLeft size={13} strokeWidth={2.5} />
        Retour
      </Link>
      <div className="page-header">
        <h2>{isEdit ? 'Modifier le capitaine' : 'Ajouter un capitaine'}</h2>
      </div>

      {error && <p className="error">{error}</p>}

      <form className="panel form-grid" onSubmit={handleSubmit}>
        {!isEdit && (
          <>
            <FormField label="E-mail">
              <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />
            </FormField>
            <FormField label="Mot de passe">
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
              />
            </FormField>
          </>
        )}
        <FormField label="Nom complet">
          <input type="text" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
        </FormField>
        <FormField label="Téléphone">
          <input type="text" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
        </FormField>
        <FormField label="WhatsApp (si différent)">
          <input type="text" value={form.whatsapp || ''} onChange={(e) => set('whatsapp', e.target.value)} />
        </FormField>
        <FormField label="Matricule véhicule">
          <input
            type="text"
            required={!isEdit}
            value={form.vehiclePlate || ''}
            onChange={(e) => set('vehiclePlate', e.target.value)}
          />
        </FormField>
        <FormField label="Modèle véhicule">
          <input type="text" value={form.vehicleModel || ''} onChange={(e) => set('vehicleModel', e.target.value)} />
        </FormField>
        <FormField label="Adresse">
          <input type="text" value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
        </FormField>
        <FormField label="N° pièce d'identité">
          <input type="text" value={form.nationalId || ''} onChange={(e) => set('nationalId', e.target.value)} />
        </FormField>
        <FormField label="N° permis">
          <input type="text" value={form.licenseNumber || ''} onChange={(e) => set('licenseNumber', e.target.value)} />
        </FormField>
        <FormField label="Expiration du permis">
          <input type="date" value={form.licenseExpiryAt || ''} onChange={(e) => set('licenseExpiryAt', e.target.value)} />
        </FormField>
        <FormField label="Type de contrat">
          <input type="text" value={form.contractType || ''} onChange={(e) => set('contractType', e.target.value)} />
        </FormField>
        {!isEdit && (
          <FormField label="Solde initial">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.initialBalance}
              onChange={(e) => set('initialBalance', e.target.value)}
            />
          </FormField>
        )}
        <div style={{ gridColumn: '1 / -1' }}>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
