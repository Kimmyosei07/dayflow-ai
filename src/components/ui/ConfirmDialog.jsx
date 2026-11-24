import Modal from './Modal.jsx';

/** Confirmation dialog used before destructive actions (see UiContext.confirm). */
export default function ConfirmDialog({ title, message, confirmLabel, cancelLabel, tone, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      size="sm"
      labelledBy="confirm-title"
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={`btn ${tone === 'danger' ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted">{message}</p>
    </Modal>
  );
}
