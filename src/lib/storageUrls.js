import { supabase } from './supabase';

const BUCKET_ALIASES = {
  'payment-slips': 'payment-slips',
  'payment-proofs': 'payment-proofs',
  'product-images': 'product-images',
};

function parseStoragePath(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const match = raw.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
  if (match) {
    return { bucket: match[1], path: decodeURIComponent(match[2].split('?')[0]), url: null };
  }
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return { bucket: null, path: null, url: raw };
  }
  return { bucket: 'payment-slips', path: raw.replace(/^\/+/, ''), url: null };
}

export async function resolveStorageFileUrl(value, preferredBucket = 'payment-slips') {
  const parsed = parseStoragePath(value);
  if (!parsed) return null;
  if (parsed.url) return parsed.url;

  const bucket = BUCKET_ALIASES[parsed.bucket] || preferredBucket;
  const path = parsed.path;

  const { data: signed, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);

  if (!signError && signed?.signedUrl) {
    return signed.signedUrl;
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicData?.publicUrl || null;
}

export function getStoragePublicUrl(path, bucket = 'payment-slips') {
  const parsed = parseStoragePath(path);
  if (!parsed) return null;
  if (parsed.url) return parsed.url;
  const { data } = supabase.storage.from(bucket).getPublicUrl(parsed.path);
  return data?.publicUrl || null;
}
