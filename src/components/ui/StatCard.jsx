/** Small metric card: icon + big number + label. */
export default function StatCard({ icon: Icon, value, label, tone = 'primary', hint }) {
  return (
    <div className="card stat-card" title={hint}>
      <div className={`stat-card__icon ${tone !== 'primary' ? `stat-card__icon--${tone}` : ''}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__label">{label}</div>
      </div>
    </div>
  );
}
