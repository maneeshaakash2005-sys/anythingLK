import { useSearchParams } from 'react-router-dom';

/**
 * Hook to detect whether the user is browsing the AnythingLK Marketplace
 * or the OrderBase SaaS platform.
 * 
 * Hostname behavior:
 * - anything.lk / anythinglk.com -> Marketplace
 * - dashboard.orderbase.lk / orderbase.lk -> SaaS
 * - localhost / 127.0.0.1 -> Marketplace by default, toggleable via ?domain=saas or ?domain=marketplace
 */
export function useDomainDetect() {
  const [searchParams] = useSearchParams();
  const hostname = window.location.hostname;
  
  const isMarketplaceDomain = 
    hostname.includes('anything') || 
    hostname.includes('anythinglk') || 
    hostname.includes('anything.lk');

  let isMarketplace = isMarketplaceDomain;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const domainParam = searchParams.get('domain');
    if (domainParam) {
      isMarketplace = domainParam === 'marketplace';
      localStorage.setItem('dev_domain', domainParam);
    } else {
      const saved = localStorage.getItem('dev_domain');
      isMarketplace = saved ? saved === 'marketplace' : true; // Default to marketplace on localhost
    }
  }

  return { isMarketplace };
}
