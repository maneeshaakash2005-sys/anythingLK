import { AlertTriangle } from 'lucide-react';
import LoadingButton from './LoadingButton';
import Modal from './Modal';

export default function ConfirmDialog({
  open,
  title = 'Confirm action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  onCancel,
  onConfirm,
}) {
  return (
    <Modal title={title} open={open} onClose={loading ? undefined : onCancel}>
      <div className="space-y-5">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="btn-secondary" type="button" disabled={loading} onClick={onCancel}>
            {cancelText}
          </button>
          <LoadingButton
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
            loading={loading}
            loadingText="Deleting..."
            onClick={onConfirm}
          >
            {confirmText}
          </LoadingButton>
        </div>
      </div>
    </Modal>
  );
}
