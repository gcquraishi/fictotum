'use client';

import { useMemo } from 'react';
import GraphExplorer from '@/components/GraphExplorer';

interface HomeGraphExplorerProps {
  figureIds: string[];
}

export default function HomeGraphExplorer({ figureIds }: HomeGraphExplorerProps) {
  const selectedId = useMemo(() => {
    if (figureIds.length === 0) return undefined;
    return figureIds[Math.floor(Math.random() * figureIds.length)];
  }, [figureIds]);

  return (
    <div style={{ height: '600px', position: 'relative' }}>
      <GraphExplorer canonicalId={selectedId} />
    </div>
  );
}
