import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from './Modal';
import { resolveStorageFileUrl } from '../lib/storageUrls';

export default function ImagePreviewModal({ title = 'Preview', open, onClose, src, bucket = 'payment-slips' }) {
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !src) {
      setResolvedUrl('');
      setError('');
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    resolveStorageFileUrl(src, bucket)
      .then((url) => {
        if (cancelled) return;
        if (!url) {
          setError('Payment slip not found');
          setResolvedUrl('');
        } else {
          setResolvedUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Payment slip not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, src, bucket]);

  const isPdf = /\.pdf(\?|$)/i.test(resolvedUrl || String(src));

  return (
    <Modal title={title} open={open} onClose={onClose}>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          Loading preview...
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-rose-600">{error}</p>
      ) : isPdf ? (
        <iframe title={title} src={resolvedUrl} className="h-[70vh] w-full rounded-md border border-slate-200 dark:border-slate-800" />
      ) : (
        <img src={resolvedUrl} alt="" className="mx-auto max-h-[70vh] w-full rounded-md object-contain" onError={() => setError('Payment slip not found')} />
      )}
    </Modal>
  );
}
