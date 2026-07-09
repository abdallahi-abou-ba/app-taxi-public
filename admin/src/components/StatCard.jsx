import { Link } from 'react-router-dom';

export default function StatCard({ label, value, to }) {
  const content = (
    <>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </>
  );

  if (to) {
    return (
      <Link className="stat-card stat-card-link" to={to}>
        {content}
      </Link>
    );
  }

  return <div className="stat-card">{content}</div>;
}
