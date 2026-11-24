/** Friendly placeholder shown when a list has no data yet. */
export default function EmptyState({ icon: Icon, title, message, children, compact = false }) {
  return (
    <div className={`empty-state ${compact ? 'empty-state--compact' : ''}`}>
      {Icon && (
        <div className="empty-state__icon">
          <Icon size={24} />
        </div>
      )}
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {children && <div className="row">{children}</div>}
    </div>
  );
}
