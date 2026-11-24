import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

/** Compact page title with optional subtitle and action buttons. */
export default function PageHeader({ title, subtitle, actions, documentTitle }) {
  useDocumentTitle(documentTitle ?? title);
  return (
    <div className="page-header">
      <div className="page-header__text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}
