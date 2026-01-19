// Kevin Bacon to Francis Bacon Network Data for Interactive Visualization
// This data represents the full network of actors, films, and connections

import { GraphNode, GraphLink } from './types';

// Featured path highlighting - demonstrating "Six Degrees" concept across 4 centuries
// ChronosGraph connects historical figures through ALL media: films, novels, plays,
// paintings, board games, TV series, poems, and more
// Path: Kevin Bacon → Francis Bacon (statesman, 1561-1626)
const FEATURED_PATH_IDS = [
  'actor-kevin-bacon',
  'media-jfk',
  'actor-jack-lemmon',
  'media-hamlet',
  'actor-derek-jacobi',
  'media-elizabeth-r',
  'figure-elizabeth-i',
  'media-anonymous',
  'figure-francis-bacon-statesman',
];

export function getBaconNetworkData(): { nodes: GraphNode[]; links: GraphLink[] } {
  // Actors
  const kevinBacon: GraphNode = {
    id: 'actor-kevin-bacon',
    name: 'Kevin Bacon',
    type: 'figure',
    sentiment: 'Complex',
  };

  const jackLemmon: GraphNode = {
    id: 'actor-jack-lemmon',
    name: 'Jack Lemmon',
    type: 'figure',
    sentiment: 'Complex',
  };

  const derekJacobi: GraphNode = {
    id: 'actor-derek-jacobi',
    name: 'Derek Jacobi',
    type: 'figure',
    sentiment: 'Complex',
  };

  const danielCraig: GraphNode = {
    id: 'actor-daniel-craig',
    name: 'Daniel Craig',
    type: 'figure',
    sentiment: 'Complex',
  };

  const tildaSwinton: GraphNode = {
    id: 'actor-tilda-swinton',
    name: 'Tilda Swinton',
    type: 'figure',
    sentiment: 'Complex',
  };

  const tomHanks: GraphNode = {
    id: 'actor-tom-hanks',
    name: 'Tom Hanks',
    type: 'figure',
    sentiment: 'Complex',
  };

  const jackNicholson: GraphNode = {
    id: 'actor-jack-nicholson',
    name: 'Jack Nicholson',
    type: 'figure',
    sentiment: 'Complex',
  };

  // Media Works
  const jfk: GraphNode = {
    id: 'media-jfk',
    name: 'JFK (1991)',
    type: 'media',
    sentiment: 'Complex',
    mediaCategory: 'primary',
  };

  const hamlet: GraphNode = {
    id: 'media-hamlet',
    name: 'Hamlet (1996)',
    type: 'media',
    sentiment: 'Complex',
    mediaCategory: 'primary',
  };

  const loveIsTheDevil: GraphNode = {
    id: 'media-love-is-the-devil',
    name: 'Love Is the Devil (1998)',
    type: 'media',
    sentiment: 'Complex',
    mediaCategory: 'primary',
  };

  const apollo13: GraphNode = {
    id: 'media-apollo-13',
    name: 'Apollo 13 (1995)',
    type: 'media',
    sentiment: 'Complex',
    mediaCategory: 'primary',
  };

  const mysticRiver: GraphNode = {
    id: 'media-mystic-river',
    name: 'Mystic River (2003)',
    type: 'media',
    sentiment: 'Complex',
    mediaCategory: 'primary',
  };

  const aFewGoodMen: GraphNode = {
    id: 'media-a-few-good-men',
    name: 'A Few Good Men (1992)',
    type: 'media',
    sentiment: 'Complex',
    mediaCategory: 'primary',
  };

  const iClaudius: GraphNode = {
    id: 'media-i-claudius',
    name: 'I, Claudius (1976)',
    type: 'media',
    sentiment: 'Complex',
    mediaCategory: 'primary',
  };

  const cadfael: GraphNode = {
    id: 'media-cadfael',
    name: 'Cadfael (1995-1999)',
    type: 'media',
    sentiment: 'Complex',
    mediaCategory: 'primary',
  };

  const elizabethR: GraphNode = {
    id: 'media-elizabeth-r',
    name: 'Elizabeth R (1971)',
    type: 'media',
    sentiment: 'Complex',
    mediaCategory: 'primary',
  };

  const anonymousFilm: GraphNode = {
    id: 'media-anonymous',
    name: 'Anonymous (2011)',
    type: 'media',
    sentiment: 'Complex',
    mediaCategory: 'primary',
  };

  const baconBiography: GraphNode = {
    id: 'media-bacon-biography',
    name: 'Francis Bacon: Anatomy of an Enigma (Book, 1996)',
    type: 'media',
    sentiment: 'Complex',
    mediaCategory: 'academic',
  };

  const screamingPope: GraphNode = {
    id: 'media-screaming-pope',
    name: 'Study after Velázquez (Painting, 1953)',
    type: 'media',
    sentiment: 'Complex',
    mediaCategory: 'primary',
  };

  const velazquezPortrait: GraphNode = {
    id: 'media-velazquez-portrait',
    name: 'Portrait of Innocent X (Painting, 1650)',
    type: 'media',
    sentiment: 'Complex',
    mediaCategory: 'primary',
  };

  // Historical Figures
  const popeInnocentX: GraphNode = {
    id: 'figure-pope-innocent-x',
    name: 'Pope Innocent X (1574-1655)',
    type: 'figure',
    sentiment: 'Complex',
  };

  const francisBaconPainter: GraphNode = {
    id: 'figure-francis-bacon-painter',
    name: 'Francis Bacon (Painter, 1909-1992)',
    type: 'figure',
    sentiment: 'Complex',
  };

  const francisBaconStatesman: GraphNode = {
    id: 'figure-francis-bacon-statesman',
    name: 'Francis Bacon (Statesman, 1561-1626)',
    type: 'figure',
    sentiment: 'Complex',
  };

  const diegoVelazquez: GraphNode = {
    id: 'figure-diego-velazquez',
    name: 'Diego Velázquez (Painter, 1599-1660)',
    type: 'figure',
    sentiment: 'Complex',
  };

  const philipIV: GraphNode = {
    id: 'figure-philip-iv',
    name: 'Philip IV of Spain (1605-1665)',
    type: 'figure',
    sentiment: 'Complex',
  };

  const elizabethI: GraphNode = {
    id: 'figure-elizabeth-i',
    name: 'Elizabeth I of England (1533-1603)',
    type: 'figure',
    sentiment: 'Complex',
  };

  // All nodes
  const nodes: GraphNode[] = [
    // Featured path - actors and historical figures
    kevinBacon,
    jackLemmon,
    derekJacobi,
    elizabethI,
    francisBaconStatesman,
    // Other historical figures
    francisBaconPainter,
    popeInnocentX,
    diegoVelazquez,
    philipIV,
    // Other actors
    danielCraig,
    tildaSwinton,
    tomHanks,
    jackNicholson,
    // Media in featured path
    jfk,
    hamlet,
    elizabethR,
    anonymousFilm,
    // Other media
    loveIsTheDevil,
    screamingPope,
    velazquezPortrait,
    baconBiography,
    apollo13,
    mysticRiver,
    aFewGoodMen,
    iClaudius,
    cadfael,
  ];

  // Links - featured path: Person-media-person pattern bridging 4 centuries
  // Kevin Bacon (20th c. actor) → Francis Bacon (16th c. statesman)
  const featuredLinks: GraphLink[] = [
    // Kevin Bacon → JFK (film)
    {
      source: 'actor-kevin-bacon',
      target: 'media-jfk',
      sentiment: 'Complex',
    },
    // JFK → Jack Lemmon (co-star)
    {
      source: 'media-jfk',
      target: 'actor-jack-lemmon',
      sentiment: 'Complex',
    },
    // Jack Lemmon → Hamlet (film)
    {
      source: 'actor-jack-lemmon',
      target: 'media-hamlet',
      sentiment: 'Complex',
    },
    // Hamlet → Derek Jacobi (co-star)
    {
      source: 'media-hamlet',
      target: 'actor-derek-jacobi',
      sentiment: 'Complex',
    },
    // Derek Jacobi → Elizabeth R (TV series)
    {
      source: 'actor-derek-jacobi',
      target: 'media-elizabeth-r',
      sentiment: 'Complex',
    },
    // Elizabeth R → Elizabeth I (historical subject)
    {
      source: 'media-elizabeth-r',
      target: 'figure-elizabeth-i',
      sentiment: 'Complex',
    },
    // Elizabeth I → Anonymous (film about Elizabethan era)
    {
      source: 'figure-elizabeth-i',
      target: 'media-anonymous',
      sentiment: 'Complex',
    },
    // Anonymous → Francis Bacon (statesman, character in film)
    {
      source: 'media-anonymous',
      target: 'figure-francis-bacon-statesman',
      sentiment: 'Complex',
    },
  ];

  // Links - additional connections
  const otherLinks: GraphLink[] = [
    // Kevin Bacon in other films
    {
      source: 'actor-kevin-bacon',
      target: 'media-apollo-13',
      sentiment: 'Complex',
    },
    {
      source: 'media-apollo-13',
      target: 'actor-tom-hanks',
      sentiment: 'Complex',
    },
    {
      source: 'actor-kevin-bacon',
      target: 'media-mystic-river',
      sentiment: 'Complex',
    },
    {
      source: 'actor-kevin-bacon',
      target: 'media-a-few-good-men',
      sentiment: 'Complex',
    },
    {
      source: 'media-a-few-good-men',
      target: 'actor-jack-nicholson',
      sentiment: 'Complex',
    },
    // Derek Jacobi in other media
    {
      source: 'actor-derek-jacobi',
      target: 'media-i-claudius',
      sentiment: 'Complex',
    },
    {
      source: 'actor-derek-jacobi',
      target: 'media-cadfael',
      sentiment: 'Complex',
    },
    // Love Is the Devil co-stars
    {
      source: 'media-love-is-the-devil',
      target: 'actor-daniel-craig',
      sentiment: 'Complex',
    },
    {
      source: 'media-love-is-the-devil',
      target: 'actor-tilda-swinton',
      sentiment: 'Complex',
    },
    // Derek Jacobi → Francis Bacon (painter) connection
    {
      source: 'actor-derek-jacobi',
      target: 'media-love-is-the-devil',
      sentiment: 'Complex',
    },
    {
      source: 'media-love-is-the-devil',
      target: 'figure-francis-bacon-painter',
      sentiment: 'Complex',
    },
    // Francis Bacon (painter) - additional connections
    {
      source: 'figure-francis-bacon-painter',
      target: 'media-screaming-pope',
      sentiment: 'Complex',
    },
    {
      source: 'media-screaming-pope',
      target: 'figure-pope-innocent-x',
      sentiment: 'Complex',
    },
    {
      source: 'figure-pope-innocent-x',
      target: 'media-velazquez-portrait',
      sentiment: 'Complex',
    },
    {
      source: 'media-velazquez-portrait',
      target: 'figure-diego-velazquez',
      sentiment: 'Complex',
    },
    {
      source: 'figure-francis-bacon-painter',
      target: 'media-bacon-biography',
      sentiment: 'Complex',
    },
  ];

  const links = [...featuredLinks, ...otherLinks];

  // Validate that all featured path IDs exist in the nodes array
  const nodeIds = new Set(nodes.map(n => n.id));
  const missingNodeIds = FEATURED_PATH_IDS.filter(id => !nodeIds.has(id));
  if (missingNodeIds.length > 0) {
    console.warn(`Featured path validation warning: Missing node IDs in nodes array: ${missingNodeIds.join(', ')}`);
  }

  return {
    nodes,
    links: links.map(link => ({
      ...link,
      // Mark featured path links for highlighting
      featured: FEATURED_PATH_IDS.includes(link.source) && FEATURED_PATH_IDS.includes(link.target),
    })),
  };
}

export function isFeaturedPathNode(nodeId: string): boolean {
  return FEATURED_PATH_IDS.includes(nodeId);
}

export function isFeaturedPathLink(source: string, target: string): boolean {
  return FEATURED_PATH_IDS.includes(source) && FEATURED_PATH_IDS.includes(target);
}
