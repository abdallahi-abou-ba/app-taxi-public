import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { getComplaint, updateComplaint } from '../../api/complaints';
import StatusBadge from '../../components/StatusBadge';
import FormField from '../../components/FormField';

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const { data: complaint, loading, error, reload } = useApi(() => getComplaint(id), [id]);

  const [status, setStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  if (loading) return <p className="hint">Chargement…</p>;
  if (error) return <p className="error">{error.message}</p>;
  if (!complaint) return null;

  async function handleUpdate(e) {
    e.preventDefault();
    setBusy(true);
    setActionError('');
    try {
      await updateComplaint(id, {
        ...(status && { status }),
        ...(adminNotes && { adminNotes }),
      });
      setStatus('');
      setAdminNotes('');
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link className="back-link" to="/complaints">
        ← Retour aux réclamations
      </Link>

      <div className="page-header">
        <h2>
          {complaint.category} <StatusBadge status={complaint.status} />
        </h2>
      </div>

      <div className="panel">
        <h3>Détails</h3>
        <div className="form-grid">
          <div>
            <strong>Soumis par</strong>
            <div className="hint">{complaint.submittedByUser?.fullName || '—'}</div>
          </div>
          <div>
            <strong>Concerne</strong>
            <div className="hint">{complaint.aboutUser?.fullName || '—'}</div>
          </div>
          <div>
            <strong>Date</strong>
            <div className="hint">{new Date(complaint.createdAt).toLocaleString('fr-FR')}</div>
          </div>
        </div>
        <p style={{ marginTop: 12 }}>{complaint.description}</p>
        {complaint.adminNotes && (
          <>
            <strong>Notes internes</strong>
            <p className="hint">{complaint.adminNotes}</p>
          </>
        )}
      </div>

      <div className="panel">
        <h3>Traiter</h3>
        {actionError && <p className="error">{actionError}</p>}
        <form className="form-grid" onSubmit={handleUpdate}>
          <FormField label="Nouveau statut">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Ne pas changer</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Notes internes">
            <input type="text" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
          </FormField>
          <div style={{ gridColumn: '1 / -1' }}>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
