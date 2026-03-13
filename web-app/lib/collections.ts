import 'server-only';
import { getSession } from './neo4j';

export interface CollectionItem {
  id: string;
  wikidata_id?: string;
  name?: string;
  title?: string;
  type: 'figure' | 'media';
  era?: string;
  historicity_status?: string;
  media_type?: string;
  release_year?: number;
  image_url?: string | null;
}

export interface CollectionDetail {
  collection: {
    collection_id: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
  };
  owner: {
    name: string;
    image: string | null;
    email: string;
  } | null;
  items: CollectionItem[];
}

export async function getCollectionById(id: string): Promise<CollectionDetail | null> {
  const dbSession = await getSession();
  try {
    const result = await dbSession.run(
      `
      MATCH (c:Collection {collection_id: $id})
      OPTIONAL MATCH (owner:User)-[:OWNS]->(c)
      OPTIONAL MATCH (c)-[:CONTAINS {item_type: 'figure'}]->(f:HistoricalFigure)
      OPTIONAL MATCH (c)-[:CONTAINS {item_type: 'media'}]->(m:MediaWork)
      RETURN
        c {
          .collection_id,
          .name,
          .description,
          .created_at,
          .updated_at
        } AS collection,
        owner { .name, .image, .email } AS owner,
        collect(DISTINCT f {
          id: f.canonical_id,
          .name,
          .era,
          .historicity_status,
          .image_url,
          type: 'figure'
        }) AS figures,
        collect(DISTINCT m {
          id: m.media_id,
          wikidata_id: m.wikidata_id,
          title: m.title,
          .media_type,
          .release_year,
          .image_url,
          type: 'media'
        }) AS works
      `,
      { id }
    );

    if (result.records.length === 0) return null;

    const record = result.records[0];
    const collection = record.get('collection');
    if (!collection) return null;

    const owner = record.get('owner');
    const figures: CollectionItem[] = (record.get('figures') || []).filter((f: any) => f.id);
    const works: CollectionItem[] = (record.get('works') || []).filter((w: any) => w.id || w.wikidata_id);

    return {
      collection,
      owner: owner || null,
      items: [...figures, ...works],
    };
  } finally {
    await dbSession.close();
  }
}
