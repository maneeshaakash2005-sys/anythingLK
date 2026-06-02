const TEMPLATE_PREVIEWS = {
  classic: ['#1e293b', '#f59e0b', '#f8fafc'],
  modern: ['#4f46e5', '#14b8a6', '#eef2ff'],
  minimal: ['#111827', '#e5e7eb', '#ffffff'],
  'mobile-commerce': ['#0f172a', '#22d3ee', '#1e293b'],
  luxury: ['#0a0a0a', '#d4af37', '#1a1a1a'],
  beauty: ['#f9a8d4', '#db2777', '#fff1f5'],
  electronics: ['#020617', '#38bdf8', '#0f172a'],
  furniture: ['#78350f', '#b45309', '#fef9f0'],
  food: ['#ef4444', '#f97316', '#fff7ed'],
  fashion: ['#701a75', '#a21caf', '#fdf2f8'],
  pharmacy: ['#064e3b', '#10b981', '#f0fdf4'],
  digital: ['#312e81', '#818cf8', '#1e1b4b'],
  restaurant: ['#1c1917', '#f59e0b', '#292524'],
  'premium-business': ['#1e3a5f', '#2563eb', '#f1f5f9'],
};

function svgDataUrl(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getTemplateScreenshotUrl(templateKey, mode = 'desktop') {
  const key = String(templateKey || '').toLowerCase().trim();
  const palette = TEMPLATE_PREVIEWS[key];
  if (!palette) return null;
  const [primary, accent, surface] = palette;
  const isMobile = mode === 'mobile';
  const width = isMobile ? 220 : 420;
  const height = isMobile ? 320 : 220;
  const columns = isMobile ? 1 : 3;
  const cardWidth = isMobile ? 164 : 104;
  const cardHeight = isMobile ? 48 : 78;
  const gap = isMobile ? 10 : 12;
  const startX = isMobile ? 28 : 34;
  const startY = isMobile ? 94 : 82;

  const cards = Array.from({ length: isMobile ? 4 : 6 }).map((_, index) => {
    const x = startX + (index % columns) * (cardWidth + gap);
    const y = startY + Math.floor(index / columns) * (cardHeight + gap);
    const imageSize = isMobile ? 34 : 34;
    return `
      <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="8" fill="#ffffff" opacity="0.95"/>
      <rect x="${x + 10}" y="${y + 10}" width="${imageSize}" height="${imageSize}" rx="6" fill="${surface}"/>
      <rect x="${x + imageSize + 18}" y="${y + 13}" width="${isMobile ? 86 : 44}" height="7" rx="3" fill="#94a3b8"/>
      <rect x="${x + imageSize + 18}" y="${y + 29}" width="${isMobile ? 54 : 34}" height="8" rx="4" fill="${accent}"/>
    `;
  }).join('');

  return svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" rx="14" fill="${surface}"/>
      <rect width="${width}" height="64" fill="${primary}"/>
      <rect x="24" y="22" width="${isMobile ? 96 : 150}" height="12" rx="6" fill="#ffffff" opacity="0.9"/>
      <rect x="${width - 86}" y="20" width="56" height="18" rx="9" fill="${accent}"/>
      ${cards}
      <rect x="${startX}" y="${height - 48}" width="${width - startX * 2}" height="28" rx="8" fill="${primary}" opacity="0.92"/>
    </svg>
  `);
}

export function hasTemplateScreenshot(templateKey) {
  return Boolean(getTemplateScreenshotUrl(templateKey, 'desktop'));
}
