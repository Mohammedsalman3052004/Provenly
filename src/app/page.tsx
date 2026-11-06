import type { Metadata } from 'next';
import { Landing } from '@/features/landing/Landing';
import { FAQ } from '@/features/landing/content';
import { APP_NAME, SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: { absolute: `${APP_NAME} — project portfolio dashboard for freelancers & agencies` },
  description: 'A client work tracker that doubles as a shareable portfolio. Create dashboards, define your own fields, hide prices from the people you share with, and put one link on your resume.',
  alternates: { canonical: '/' },
};

export default function Page() {
  const ld = [
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: APP_NAME, applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: SITE_URL, description: 'Project portfolio dashboard and client work tracker for freelancers, developers, designers and agencies.', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
    { '@context': 'https://schema.org', '@type': 'Organization', name: APP_NAME, url: SITE_URL },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ];
  return (
    <>
      <noscript><style>{'.lp [data-r], .lp [data-hero] { opacity: 1 !important; }'}</style></noscript>
      <Landing />
      {ld.map((o, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(o).replace(/</g, '\\u003c') }} />)}
    </>
  );
}
