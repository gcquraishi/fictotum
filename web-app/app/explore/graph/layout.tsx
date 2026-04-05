import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Graph Explorer',
  description:
    'Explore the connections between historical figures and media works in an interactive network graph. Navigate the web of history and fiction.',
  openGraph: {
    title: 'Graph Explorer — Fictotum',
    description:
      'Navigate the web of historical figure portrayals in an interactive network graph.',
  },
  twitter: {
    card: 'summary',
    title: 'Graph Explorer — Fictotum',
    description:
      'Navigate the web of historical figure portrayals in an interactive network graph.',
  },
};

export default function GraphLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
