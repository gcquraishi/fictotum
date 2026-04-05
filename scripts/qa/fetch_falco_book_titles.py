#!/usr/bin/env python3
"""
Fetch titles for Lindsey Davis Falco books from Wikidata

Fetches proper titles for Q-IDs that currently show as just their Q-ID
"""

import requests
import json

def get_wikidata_entity(qid: str) -> dict:
    """Fetch entity data from Wikidata API"""
    url = "https://www.wikidata.org/w/api.php"
    params = {
        "action": "wbgetentities",
        "ids": qid,
        "props": "labels|descriptions|claims",
        "languages": "en",
        "format": "json"
    }
    headers = {
        "User-Agent": "Fictotum/1.0 (CHR-79 Series Linking)"
    }

    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        if "entities" in data and qid in data["entities"]:
            entity = data["entities"][qid]

            # Extract label
            label = entity.get("labels", {}).get("en", {}).get("value", qid)

            # Extract description
            description = entity.get("descriptions", {}).get("en", {}).get("value", "")

            # Extract P179 (part of the series) if exists
            claims = entity.get("claims", {})
            part_of_series = None
            series_ordinal = None

            if "P179" in claims:
                series_claim = claims["P179"][0]
                part_of_series = series_claim["mainsnak"]["datavalue"]["value"]["id"]

                # Check for series ordinal (P1545)
                if "qualifiers" in series_claim and "P1545" in series_claim["qualifiers"]:
                    series_ordinal = series_claim["qualifiers"]["P1545"][0]["datavalue"]["value"]

            # Extract publication date (P577)
            publication_year = None
            if "P577" in claims:
                pub_date_claim = claims["P577"][0]["mainsnak"]
                if "datavalue" in pub_date_claim:
                    pub_date = pub_date_claim["datavalue"]["value"]["time"]
                    # Extract year from +YYYY-MM-DD format
                    publication_year = int(pub_date[1:5])

            return {
                "qid": qid,
                "label": label,
                "description": description,
                "part_of_series": part_of_series,
                "series_ordinal": int(series_ordinal) if series_ordinal else None,
                "publication_year": publication_year
            }

    except Exception as e:
        print(f"Error fetching {qid}: {e}")
        return None

def main():
    qids = [
        "Q133247684",
        "Q133247688",
        "Q133296082",
        "Q131851728",
        "Q132323389",
        "Q133261773",
        "Q132128654",
        "Q131930178",
    ]

    print("Fetching Lindsey Davis Falco book data from Wikidata...\n")

    results = []
    for qid in qids:
        print(f"Fetching {qid}...", end=" ")
        data = get_wikidata_entity(qid)
        if data:
            results.append(data)
            print(f"✓ {data['label']}")
            print(f"  Series: {data.get('part_of_series')}, Ordinal: {data.get('series_ordinal')}, Year: {data.get('publication_year')}")
        else:
            print("✗ Failed")

    # Print summary
    print(f"\n{'='*80}")
    print("SUMMARY")
    print(f"{'='*80}")
    for book in sorted(results, key=lambda x: x.get('series_ordinal') or 999):
        seq = book.get('series_ordinal', '?')
        year = book.get('publication_year', 'Unknown')
        print(f"#{seq:2} - {book['label']} ({year}) - {book['qid']}")

    # Save to JSON for easy reference
    with open("falco_books_data.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n✅ Data saved to falco_books_data.json")

if __name__ == "__main__":
    main()
