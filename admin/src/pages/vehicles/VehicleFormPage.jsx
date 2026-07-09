import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createVehicle, getVehicle, updateVehicle } from '../../api/vehicles';
import FormField from '../../components/FormField';

const EMPTY = {
  brand: '',
  model: '',
  plate: '',
  color: '',
  year: '',
  type: '',
  seatCount: '',
  insuranceProvider: '',
  insuranceNumber: '',
  insuranceExpiresAt: '',
  carteGriseNumber: '',
  technicalInspectionExpiresAt: '',
};

function toDateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

export default function VehicleFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    getVehicle(id)
      .then(({ data }) =>
        setForm({
          ...EMPTY,
          ...data,
          insuranceExpiresAt: toDateInput(data.insuranceExpiresAt),
          technicalInspectionExpiresAt: toDateInput(data.technicalInspectionExpiresAt),
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
      const payload = { ...form };
      if (payload.year !== '') payload.year = Number(payload.year);
      else delete payload.year;
      if (payload.seatCount !== '') payload.seatCount = Number(payload.seatCount);
      else delete payload.seatCount;
      for (const key of Object.keys(payload)) {
        if (payload[key] === '') delete payload[key];
      }

      if (isEdit) {
        await updateVehicle(id, payload);
        navigate(`/vehicles/${id}`);
      } else {
        const { data } = await createVehicle(payload);
        navigate(`/vehicles/${data.id}`);
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
      <Link className="back-link" to={isEdit ? `/vehicles/${id}` : '/vehicles'}>
        ← Retour
      </Link>
      <div className="page-header">
        <h2>{isEdit ? 'Modifier le véhicule' : 'Ajouter un véhicule'}</h2>
      </div>

      {error && <p className="error">{error}</p>}

      <form className="panel form-grid" onSubmit={handleSubmit}>
        <FormField label="Marque">
          <input type="text" required value={form.brand} onChange={(e) => set('brand', e.target.value)} />
        </FormField>
        <FormField label="Modèle">
          <input type="text" required value={form.model} onChange={(e) => set('model', e.target.value)} />
        </FormField>
        <FormField label="Matricule">
          <input type="text" required value={form.plate} onChange={(e) => set('plate', e.target.value)} />
        </FormField>
        <FormField label="Couleur">
          <input type="text" value={form.color || ''} onChange={(e) => set('color', e.target.value)} />
        </FormField>
        <FormField label="Année">
          <input type="number" value={form.year || ''} onChange={(e) => set('year', e.target.value)} />
        </FormField>
        <FormField label="Type">
          <input type="text" value={form.type || ''} onChange={(e) => set('type', e.target.value)} />
        </FormField>
        <FormField label="Nombre de places">
          <input type="number" value={form.seatCount || ''} onChange={(e) => set('seatCount', e.target.value)} />
        </FormField>
        <FormField label="Assureur">
          <input type="text" value={form.insuranceProvider || ''} onChange={(e) => set('insuranceProvider', e.target.value)} />
        </FormField>
        <FormField label="N° assurance">
          <input type="text" value={form.insuranceNumber || ''} onChange={(e) => set('insuranceNumber', e.target.value)} />
        </FormField>
        <FormField label="Expiration assurance">
          <input
            type="date"
            value={form.insuranceExpiresAt || ''}
            onChange={(e) => set('insuranceExpiresAt', e.target.value)}
          />
        </FormField>
        <FormField label="N° carte grise">
          <input type="text" value={form.carteGriseNumber || ''} onChange={(e) => set('carteGriseNumber', e.target.value)} />
        </FormField>
        <FormField label="Expiration visite technique">
          <input
            type="date"
            value={form.technicalInspectionExpiresAt || ''}
            onChange={(e) => set('technicalInspectionExpiresAt', e.target.value)}
          />
        </FormField>

        <div style={{ gridColumn: '1 / -1' }}>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
