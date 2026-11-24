import { useEffect } from 'react';
import { onStorageIssue } from '../../services/storage/storageService.js';
import { useUi } from '../../context/UiContext.jsx';

/** Shows a toast if LocalStorage is full or saved data was corrupted. */
export default function StorageWatcher() {
  const { toast } = useUi();
  useEffect(() => onStorageIssue((issue) => toast(issue.message, 'error', 8000)), [toast]);
  return null;
}
