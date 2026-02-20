export const dynamic = 'force-dynamic';
// file: web-app/app/api/wikidata/by-creator/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';

interface WikidataWork {
  qid: string;
  title: string;
  year: number | null;
  type: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const creatorName = searchParams.get('name');
  const creatorQid = searchParams.get('qid');

  if (!creatorName && !creatorQid) {
    return NextResponse.json({ error: 'Creator name or Q-ID is required' }, { status: 400 });
  }

  if (creatorName && creatorName.length < 2) {
    return NextResponse.json({ error: 'Creator name must be at least 2 characters' }, { status: 400 });
  }

  try {
    // Build SPARQL query to find works by creator
    let creatorPattern = '';
    if (creatorQid) {
      creatorPattern = `BIND(wd:${creatorQid} AS ?creator)`;
    } else {
      creatorPattern = `?creator rdfs:label "${creatorName}"@en .`;
    }

    const sparqlQuery = `
      SELECT DISTINCT ?work ?workLabel ?date ?typeLabel WHERE {
        # Find the creator
        ${creatorPattern}

        # Find works created by this person
        # P170 = creator, P50 = author, P57 = director, P178 = developer
        {
          ?work wdt:P170 ?creator .
        } UNION {
          ?work wdt:P50 ?creator .
        } UNION {
          ?work wdt:P57 ?creator .
        } UNION {
          ?work wdt:P178 ?creator .
        }

        # Get the type of work
        ?work wdt:P31 ?type .

        # Filter to only relevant media types
        VALUES ?type {
          wd:Q7725634    # literary work
          wd:Q571        # book
          wd:Q11424      # film
          wd:Q5398426    # TV series
          wd:Q7889       # video game
          wd:Q1261214    # video game franchise
        }

        # Get publication/release date
        OPTIONAL { ?work wdt:P577 ?date . }

        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      }
      LIMIT 100
    `;

    const wikidataUrl = 'https://query.wikidata.org/sparql';
    const response = await fetch(wikidataUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'Fictotum/1.0 (https://fictotum.com)',
      },
      body: `query=${encodeURIComponent(sparqlQuery)}`,
    });

    if (!response.ok) {
      throw new Error(`Wikidata query failed: ${response.statusText}`);
    }

    const data = await response.json();
    const bindings = data.results?.bindings || [];

    const works: WikidataWork[] = bindings.map((item: any) => {
      const workUri = item.work?.value || '';
      const qid = workUri.split('/').pop() || '';
      const title = item.workLabel?.value || 'Unknown';
      const dateStr = item.date?.value;
      const type = item.typeLabel?.value || 'Unknown';

      let year: number | null = null;
      if (dateStr) {
        try {
          year = parseInt(dateStr.split('-')[0]);
        } catch (e) {
          // Ignore parse errors
        }
      }

      return { qid, title, year, type };
    });

    return NextResponse.json({
      creator: creatorName || creatorQid,
      works,
      count: works.length,
    });
  } catch (error) {
    console.error('Wikidata by-creator error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch works from Wikidata' },
      { status: 500 }
    );
  }
}
