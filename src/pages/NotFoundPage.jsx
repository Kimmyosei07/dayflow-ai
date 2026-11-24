import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="page">
      <div className="card">
        <EmptyState icon={Compass} title="Page not found" message="The page you were looking for doesn't exist.">
          <Link to="/" className="btn btn--primary">
            Back to dashboard
          </Link>
        </EmptyState>
      </div>
    </div>
  );
}
