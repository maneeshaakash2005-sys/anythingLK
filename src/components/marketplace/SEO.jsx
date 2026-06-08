import { useEffect } from 'react';

/**
 * SEO component to dynamically update document tags and inject JSON-LD schemas
 * on the client side without needing external libraries.
 */
export default function SEO({ title, description, image, url, jsonLd }) {
  useEffect(() => {
    // 1. Title
    if (title) {
      document.title = `${title} | AnythingLK Marketplace`;
    } else {
      document.title = 'AnythingLK | Premium Sri Lankan Marketplace';
    }

    // Helper to update/create meta tags
    const updateMetaTag = (property, value, isProperty = false) => {
      if (!value) return;
      const attributeName = isProperty ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attributeName}="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attributeName, property);
        document.head.appendChild(tag);
      }
      tag.content = value;
    };

    // 2. Standard Meta Tags
    updateMetaTag('description', description || 'Discover the best local Sri Lankan stores, popular products, verified merchants, and custom reviews on AnythingLK Marketplace.');
    updateMetaTag('keywords', 'anythinglk, orderbase, Sri Lanka shopping, ecommerce, local stores, Colombo shopping, buy online Sri Lanka');

    // 3. Open Graph / Facebook
    updateMetaTag('og:title', title ? `${title} | AnythingLK` : 'AnythingLK Marketplace', true);
    updateMetaTag('og:description', description || 'Discover the best local Sri Lankan stores, popular products, and verified merchants on AnythingLK.', true);
    updateMetaTag('og:image', image || '/logo.png', true);
    updateMetaTag('og:url', url || window.location.href, true);
    updateMetaTag('og:type', 'website', true);

    // 4. Twitter Cards
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title ? `${title} | AnythingLK` : 'AnythingLK Marketplace');
    updateMetaTag('twitter:description', description || 'Discover the best local Sri Lankan stores and verified merchants.');
    updateMetaTag('twitter:image', image || '/logo.png');

    // 5. JSON-LD Structured Data Schema
    let scriptTag = document.getElementById('jsonld-schema');
    if (jsonLd) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'jsonld-schema';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(jsonLd);
    } else {
      if (scriptTag) {
        scriptTag.remove();
      }
    }
  }, [title, description, image, url, jsonLd]);

  return null;
}
