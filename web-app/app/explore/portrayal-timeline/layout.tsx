import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portrayal Timeline',
  description:
    'Visualize figure lifespans against the media works that portray them. See which eras attract the most creative attention across history.',
  openGraph: {
    title: 'Portrayal Timeline — Fictotum',
    description:
      'Visualize figure lifespans against the media works that portray them across history.',
  },
  twitter: {
    card: 'summary',
    title: 'Portrayal Timeline — Fictotum',
    description:
      'Visualize figure lifespans against the media works that portray them across history.',
  },
};

export default function PortrayalTimelineLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
