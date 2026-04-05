import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pathfinder',
  description:
    'Find the shortest path between any two historical figures through their shared media portrayals. Six degrees of historical separation.',
  openGraph: {
    title: 'Pathfinder — Fictotum',
    description:
      'Find the shortest path between any two historical figures through shared media portrayals.',
  },
  twitter: {
    card: 'summary',
    title: 'Pathfinder — Fictotum',
    description:
      'Find the shortest path between any two historical figures through shared media portrayals.',
  },
};

export default function PathfinderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
