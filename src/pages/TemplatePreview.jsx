import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

/* ─── Demo data ────────────────────────────────────────────────────────── */
const DEMO_PRODUCTS = [
  { id: 1, name: 'Premium Wireless Headphones', price: 12900, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80', category: 'Electronics', stock: 24 },
  { id: 2, name: 'Silk Evening Blouse', price: 4500, image: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=600&q=80', category: 'Fashion', stock: 12 },
  { id: 3, name: 'Organic Face Serum 30ml', price: 3200, image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80', category: 'Beauty', stock: 50 },
  { id: 4, name: 'Ergonomic Office Chair', price: 38500, image: 'https://images.unsplash.com/photo-1585821569331-f071db2abd8d?auto=format&fit=crop&w=600&q=80', category: 'Furniture', stock: 8 },
  { id: 5, name: 'Mango Float Cake (1kg)', price: 1800, image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=600&q=80', category: 'Food', stock: 5 },
  { id: 6, name: 'Vitamin C Complex 60 Caps', price: 1450, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80', category: 'Pharmacy', stock: 100 },
];

/* ─── Template palette registry ────────────────────────────────────────── */
const TEMPLATE_CONFIG = {
  /* ── Basic ─────────────────────────────────────────────── */
  classic: {
    name: 'Classic Store',
    headerBg: '#1e293b',
    headerText: '#f1f5f9',
    accent: '#f59e0b',
    bodyBg: '#f8fafc',
    cardBg: '#ffffff',
    radius: '4px',
    font: "'Georgia', serif",
    layout: 'list',
    tagline: 'Quality you can trust, service you can count on.',
  },
  modern: {
    name: 'Modern Store',
    headerBg: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    headerText: '#ffffff',
    accent: '#6366f1',
    bodyBg: '#f5f3ff',
    cardBg: '#ffffff',
    radius: '12px',
    font: "'Inter', sans-serif",
    layout: 'grid',
    tagline: 'Shop the future, today.',
  },
  minimal: {
    name: 'Minimal Store',
    headerBg: '#ffffff',
    headerText: '#111827',
    accent: '#111827',
    bodyBg: '#fafafa',
    cardBg: '#ffffff',
    radius: '2px',
    font: "'Helvetica Neue', sans-serif",
    layout: 'list',
    tagline: 'Less is more.',
  },
  'mobile-commerce': {
    name: 'Mobile Commerce',
    headerBg: '#0f172a',
    headerText: '#f1f5f9',
    accent: '#22d3ee',
    bodyBg: '#0f172a',
    cardBg: '#1e293b',
    radius: '16px',
    font: "'Inter', sans-serif",
    layout: 'grid',
    tagline: 'Built for your thumb.',
    dark: true,
  },
  /* ── Pro ─────────────────────────────────────────────── */
  luxury: {
    name: 'Luxury Brand',
    headerBg: '#0a0a0a',
    headerText: '#d4af37',
    accent: '#d4af37',
    bodyBg: '#111111',
    cardBg: '#1a1a1a',
    radius: '0px',
    font: "'Playfair Display', Georgia, serif",
    layout: 'grid',
    tagline: 'Crafted for the discerning few.',
    dark: true,
  },
  beauty: {
    name: 'Beauty & Cosmetics',
    headerBg: 'linear-gradient(135deg,#f9a8d4,#fbcfe8)',
    headerText: '#831843',
    accent: '#db2777',
    bodyBg: '#fff1f5',
    cardBg: '#ffffff',
    radius: '24px',
    font: "'Georgia', serif",
    layout: 'grid',
    tagline: 'Glow up, every day.',
  },
  electronics: {
    name: 'Electronics Store',
    headerBg: '#0f172a',
    headerText: '#38bdf8',
    accent: '#0ea5e9',
    bodyBg: '#020617',
    cardBg: '#0f172a',
    radius: '8px',
    font: "'Inter', sans-serif",
    layout: 'grid',
    tagline: 'Power your world.',
    dark: true,
  },
  furniture: {
    name: 'Furniture Store',
    headerBg: '#78350f',
    headerText: '#fef3c7',
    accent: '#b45309',
    bodyBg: '#fef9f0',
    cardBg: '#ffffff',
    radius: '6px',
    font: "'Georgia', serif",
    layout: 'list',
    tagline: 'Comfort meets craftsmanship.',
  },
  food: {
    name: 'Food Ordering',
    headerBg: 'linear-gradient(135deg,#ef4444,#f97316)',
    headerText: '#ffffff',
    accent: '#ef4444',
    bodyBg: '#fff7ed',
    cardBg: '#ffffff',
    radius: '16px',
    font: "'Inter', sans-serif",
    layout: 'grid',
    tagline: 'Fresh. Fast. Flavourful.',
  },
  fashion: {
    name: 'Fashion Boutique',
    headerBg: '#fdf2f8',
    headerText: '#701a75',
    accent: '#a21caf',
    bodyBg: '#fdf2f8',
    cardBg: '#ffffff',
    radius: '20px',
    font: "'Georgia', serif",
    layout: 'grid',
    tagline: 'Style is a language. Speak it boldly.',
  },
  pharmacy: {
    name: 'Pharmacy Store',
    headerBg: '#064e3b',
    headerText: '#ecfdf5',
    accent: '#10b981',
    bodyBg: '#f0fdf4',
    cardBg: '#ffffff',
    radius: '8px',
    font: "'Inter', sans-serif",
    layout: 'list',
    tagline: 'Your health. Our priority.',
  },
  digital: {
    name: 'Digital Products',
    headerBg: 'linear-gradient(135deg,#312e81,#1e1b4b)',
    headerText: '#c7d2fe',
    accent: '#818cf8',
    bodyBg: '#1e1b4b',
    cardBg: '#312e81',
    radius: '12px',
    font: "'Inter', sans-serif",
    layout: 'grid',
    tagline: 'Instant downloads. Infinite value.',
    dark: true,
  },
  restaurant: {
    name: 'Restaurant Ordering',
    headerBg: '#1c1917',
    headerText: '#fbbf24',
    accent: '#f59e0b',
    bodyBg: '#1c1917',
    cardBg: '#292524',
    radius: '4px',
    font: "'Georgia', serif",
    layout: 'grid',
    tagline: 'Reserve your table. Order ahead.',
    dark: true,
  },
  'premium-business': {
    name: 'Premium Business',
    headerBg: '#1e3a5f',
    headerText: '#ffffff',
    accent: '#2563eb',
    bodyBg: '#f1f5f9',
    cardBg: '#ffffff',
    radius: '8px',
    font: "'Inter', sans-serif",
    layout: 'list',
    tagline: 'Enterprise-grade ordering, simplified.',
  },
};

function ProductCard({ product, config }) {
  const isGrid = config.layout === 'grid';
  const isDark = config.dark;

  const cardStyle = {
    background: config.cardBg,
    borderRadius: config.radius,
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: isGrid ? 'column' : 'row',
    alignItems: isGrid ? 'stretch' : 'center',
    gap: '0',
    fontFamily: config.font,
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  };

  const imageStyle = {
    width: isGrid ? '100%' : '72px',
    height: isGrid ? '160px' : '72px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
    fontSize: '2rem',
  };

  const emojis = { Electronics: '🎧', Fashion: '👗', Beauty: '💄', Furniture: '🪑', Food: '🍰', Pharmacy: '💊' };
  const emoji = emojis[product.category] || '📦';

  return (
    <div style={cardStyle}>
      <div style={imageStyle}>
        {product.image ? (
          <img src={product.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : null}
      </div>
      <div style={{ padding: '12px 14px', flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: isDark ? '#f1f5f9' : '#1e293b', lineHeight: 1.3 }}>
          {product.name}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }}>
          {product.category}
        </p>
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, color: config.accent, fontSize: '0.9rem' }}>
            LKR {product.price.toLocaleString()}
          </span>
          <button
            type="button"
            style={{
              background: config.accent,
              color: '#fff',
              border: 'none',
              borderRadius: config.radius,
              padding: '5px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckoutSection({ config }) {
  const isDark = config.dark;
  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 12px',
    borderRadius: config.radius,
    border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1',
    background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
    color: isDark ? '#f1f5f9' : '#1e293b',
    fontSize: '0.85rem',
    fontFamily: config.font,
    outline: 'none',
  };
  return (
    <div style={{ marginTop: '24px', padding: '20px', background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', borderRadius: config.radius, border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 14px', fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#f1f5f9' : '#1e293b', fontFamily: config.font }}>
        Your Details
      </h3>
      <div style={{ display: 'grid', gap: '10px' }}>
        {['Your Name', 'Phone Number', 'Delivery Address'].map((ph) => (
          <input key={ph} readOnly style={inputStyle} placeholder={ph} />
        ))}
      </div>
      <button
        type="button"
        style={{
          marginTop: '14px',
          width: '100%',
          padding: '11px',
          background: config.accent,
          color: '#fff',
          border: 'none',
          borderRadius: config.radius,
          fontSize: '0.9rem',
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: config.font,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <ShoppingCart size={16} />
        Place Order
      </button>
    </div>
  );
}

export default function TemplatePreview() {
  const { templateKey } = useParams();
  const navigate = useNavigate();
  const config = TEMPLATE_CONFIG[templateKey];

  if (!config) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: '#f8fafc' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Template not found</h1>
        <p style={{ color: '#64748b', margin: 0 }}>No preview exists for &quot;{templateKey}&quot;</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard/templates')}
          style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          Back to Templates
        </button>
      </div>
    );
  }

  const isDark = config.dark;
  const isGrid = config.layout === 'grid';

  return (
    <div style={{ minHeight: '100vh', background: config.bodyBg, fontFamily: config.font }}>
      {/* Top bar */}
      <div
        style={{
          background: config.headerBg,
          color: config.headerText,
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard/templates')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: 'inherit',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{config.name}</span>
          <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '20px' }}>
            Preview
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Demo — not a real store</div>
      </div>

      {/* Shop header */}
      <div
        style={{
          background: config.headerBg,
          color: config.headerText,
          textAlign: 'center',
          padding: '32px 24px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, fontFamily: config.font }}>
          {config.name}
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: '0.9rem', opacity: 0.75 }}>{config.tagline}</p>
      </div>

      {/* Products */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: isDark ? '#f1f5f9' : '#1e293b' }}>
          Products
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isGrid ? 'repeat(auto-fill, minmax(180px, 1fr))' : '1fr',
            gap: '12px',
          }}
        >
          {DEMO_PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} config={config} />
          ))}
        </div>

        {/* Order summary */}
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            background: config.cardBg,
            borderRadius: config.radius,
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
          }}
        >
          <h3 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 700, color: isDark ? '#f1f5f9' : '#1e293b' }}>
            Order Summary
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748b' }}>
            <span>2 items</span>
            <span style={{ fontWeight: 700, color: config.accent }}>LKR 17,400</span>
          </div>
          <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8' }}>
            <span>Delivery</span>
            <span>Free</span>
          </div>
        </div>

        <CheckoutSection config={config} />
      </div>
    </div>
  );
}
