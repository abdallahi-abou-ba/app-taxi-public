import { Link } from 'react-router-dom';

export default function StatCard({ label, value, to, icon: Icon, tone = 'neutral' }) {
  const content = (
    <>
      {Icon && (
        <div className="stat-card-icon">
          <Icon size={17} strokeWidth={2.25} />
        </div>
      )}
      <div className="stat-card-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </>
  );

  const className = `stat-card tone-${tone}${to ? ' stat-card-link' : ''}`;

  if (to) {
    return (
      <Link className={className} to={to}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
