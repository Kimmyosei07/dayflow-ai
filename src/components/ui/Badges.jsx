import { PRIORITIES, CATEGORIES, ACADEMIC_TYPES, labelFor, categoryColor } from '../../utils/constants.js';

export function PriorityBadge({ priority }) {
  return <span className={`badge badge--${priority}`}>{labelFor(PRIORITIES, priority)}</span>;
}

export function CategoryBadge({ category }) {
  return (
    <span className="badge">
      <span className="dot" style={{ background: categoryColor(category) }} />
      {labelFor(CATEGORIES, category)}
    </span>
  );
}

export function AcademicTypeBadge({ type }) {
  if (!type) return null;
  return <span className="badge badge--primary">{labelFor(ACADEMIC_TYPES, type)}</span>;
}

/** Marks records created by "Load sample data". */
export function SampleBadge() {
  return (
    <span className="badge badge--sample" title="Sample data — remove it any time in Settings">
      Sample
    </span>
  );
}
