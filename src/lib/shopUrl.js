export function slugifyShopName(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'shop';
}

export function getShopPublicPath(slug) {
  const clean = slugifyShopName(slug);
  return `/shop/${clean}`;
}

export function getShopPublicUrl(slug) {
  if (typeof window === 'undefined') return getShopPublicPath(slug);
  return `${window.location.origin}${getShopPublicPath(slug)}`;
}
