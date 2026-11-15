import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { site } from '../../../data/legendsSite.js';
import useLegendsContent from '../../../hooks/useLegendsContent.js';

/** Confirmed venue fields only — phone / Facebook appear when staff publish them. */
export default function LocalBusinessJsonLd() {
  const { pathname } = useLocation();
  const { content } = useLegendsContent();
  const show = pathname === '/legends' || pathname === '/legends/' || pathname.startsWith('/legends/visit');

  useEffect(() => {
    const id = 'legends-local-business-jsonld';
    const existing = document.getElementById(id);
    if (!show) {
      if (existing) existing.remove();
      return undefined;
    }
    const phone = content?.visitFacts?.phone || site.phone;
    const facebook = content?.visitFacts?.facebookUrl || site.facebookUrl;
    const data = {
      '@context': 'https://schema.org',
      '@type': 'SportsActivityLocation',
      name: site.name,
      description: site.description,
      sport: 'Pool',
      url: `${window.location.origin}/#/legends`,
      address: {
        '@type': 'PostalAddress',
        streetAddress: site.address.street,
        addressLocality: site.address.city,
        addressRegion: site.address.region,
        addressCountry: site.address.country || 'US',
      },
    };
    if (phone) data.telephone = phone;
    if (facebook) data.sameAs = [facebook];

    let script = existing;
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
    return () => {
      const node = document.getElementById(id);
      if (node) node.remove();
    };
  }, [show, content]);

  return null;
}
