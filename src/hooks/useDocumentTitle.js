import { useEffect } from 'react';

/** Sets the browser tab title, e.g. "My Tasks · DAYFLOW AI". */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · DAYFLOW AI` : 'DAYFLOW AI';
  }, [title]);
}
