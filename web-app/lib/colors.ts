/**
 * Fisk-inspired color palette — shared across Timeline, GraphExplorer, and HomeGraphHero.
 * Named after Harold Fisk's Mississippi River meander maps: muted, watercolor-like era tones
 * on a warm cream background with translucent overlapping elements.
 */

export const ERA_COLORS: Record<string, string> = {
  'Ancient': '#B8860B',
  'Classical Antiquity': '#CD853F',
  'Ancient Rome': '#A0522D',
  'Ancient Greece': '#6B8E23',
  'Ancient Egypt': '#DAA520',
  'Medieval': '#556B2F',
  'Middle Ages': '#556B2F',
  'Renaissance': '#6A5ACD',
  'Tudor': '#8B4513',
  'Early Modern': '#4682B4',
  'Enlightenment': '#B8860B',
  'Victorian Era': '#8B4513',
  'Napoleonic': '#4169E1',
  'Modern': '#2F4F4F',
  'Contemporary': '#36454F',
  'World War': '#8B0000',
};

/** Returns an era-matched color, or a deterministic hue derived from the era string. */
export function getEraColor(era?: string): string {
  if (!era) return '#8B7355';
  for (const [key, color] of Object.entries(ERA_COLORS)) {
    if (era.toLowerCase().includes(key.toLowerCase())) return color;
  }
  // Deterministic hash → muted hue for unknown eras
  let hash = 0;
  for (let i = 0; i < era.length; i++) {
    hash = era.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 30%, 42%)`;
}

/** Shared palette constants for graph views. */
export const GRAPH_PALETTE = {
  /** Warm cream canvas background (Fisk map paper tone) */
  CREAM_BG: '#FAF8F0',
  /** Muted warm tone for media/work nodes */
  MEDIA_NODE_COLOR: '#A0937D',
  /** Default link color — warm, very translucent */
  LINK_COLOR: 'rgba(160,147,125,0.15)',
  /** Featured/highlighted link color */
  LINK_FEATURED_COLOR: '#B8860B',
  /** Label text color */
  LABEL_COLOR: '#4A4535',
  /** Zebra-stripe alternate row tint (timeline) */
  LANE_ALT_BG: '#F2EDE0',
} as const;
