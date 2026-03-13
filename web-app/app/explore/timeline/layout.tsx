import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Timeline',
  description:
    'Browse historical figures across time on an interactive zoomable timeline. Filter by era and media type to discover patterns in how history is portrayed.',
  openGraph: {
    title: 'Timeline — Fictotum',
    description:
      'Browse historical figures across time on an interactive zoomable timeline.',
  },
  twitter: {
    card: 'summary',
    title: 'Timeline — Fictotum',
    description:
      'Browse historical figures across time on an interactive zoomable timeline.',
  },
};

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
