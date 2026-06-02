import { ImagePlus, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function ImageUploadField({
  value,
  previewUrl,
  uploading = false,
  progress = 0,
  acceptedTypes = IMAGE_TYPES,
  maxFileSize = MAX_FILE_SIZE,
  helperText = 'JPG, PNG, WEBP up to 5MB',
  onFileSelect,
  onRemove,
  error,
}) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const resolvedPreview = useMemo(() => previewUrl || value || '', [previewUrl, value]);

  function validateFile(file) {
    if (!file) return 'No file selected.';
    if (!acceptedTypes.includes(file.type)) return 'Unsupported file type.';
    if (file.size > maxFileSize) return `File must be ${Math.round(maxFileSize / 1024 / 1024)}MB or smaller.`;
    return null;
  }

  function handleFiles(fileList) {
    const file = fileList?.[0];
    const validationError = validateFile(file);
    if (validationError) {
      onFileSelect?.(null, validationError);
      return;
    }
    onFileSelect?.(file, null);
  }

  return (
    <div className="space-y-3">
      <div
        className={`rounded-md border border-dashed p-4 transition ${dragActive ? 'border-brand-500 bg-brand-500/10' : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60'}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={acceptedTypes.join(',')}
          onChange={(event) => handleFiles(event.target.files)}
        />
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <UploadCloud className="h-6 w-6 text-slate-500 dark:text-slate-300" aria-hidden="true" />
          <p className="text-sm text-slate-700 dark:text-slate-200">Drag and drop an image here, or</p>
          <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            Select from gallery
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
        </div>
      </div>

      {uploading ? (
        <div className="space-y-2 text-sm text-slate-500 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Uploading...
          </div>
          <div className="h-2 overflow-hidden rounded bg-slate-200 dark:bg-slate-800">
            <div className="h-full rounded bg-brand-600 transition-all" style={{ width: `${Math.max(progress || 8, 8)}%` }} />
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {resolvedPreview ? (
        <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          {String(resolvedPreview).toLowerCase().endsWith('.pdf') ? (
            <p className="rounded-md bg-slate-50 px-3 py-4 text-sm dark:bg-slate-800">PDF selected</p>
          ) : (
            <img src={resolvedPreview} alt="" className="h-36 w-full rounded-md object-cover" />
          )}
          <div className="mt-3 flex justify-end">
            <button type="button" className="btn-secondary" onClick={onRemove}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remove image
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
