import os, requests
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

def get_wikidata_info(name):
    url = "https://www.wikidata.org/w/api.php"
    params = {"action": "wbsearchentities", "language": "en", "format": "json", "search": name}
    try:
        data = requests.get(url, params=params).json()
        if data.get('search'):
            q_id = data['search'][0]['id']
            # Fetch creator info (Property P50 for author, P57 for director, P178 for developer)
            detail_url = f"https://www.wikidata.org/wiki/Special:EntityData/{q_id}.json"
            detail_data = requests.get(detail_url).json()
            # Simple logic to find a creator name; deep research is better, but this handles basics
            return q_id
    except Exception:
        return None
    return None

def backfill_metadata(tx):
    # Process Historical Figures
    nodes = tx.run("MATCH (f:HistoricalFigure) WHERE f.wikidata_id IS NULL RETURN f.name AS name")
    for record in nodes:
        name = record["name"]
        q_id = get_wikidata_info(name)
        if q_id:
            # Check if Q-ID already exists for another figure
            existing = tx.run("MATCH (f:HistoricalFigure {wikidata_id: $q_id}) RETURN f.name AS existing_name LIMIT 1", q_id=q_id).single()
            if existing:
                print(f"⚠️  CONFLICT: {name} -> {q_id} already assigned to {existing['existing_name']}")
            else:
                tx.run("MATCH (f:HistoricalFigure {name: $name}) SET f.wikidata_id = $q_id", name=name, q_id=q_id)
                print(f"Updated Figure: {name} -> {q_id}")

    # Process Media Works (Adding Creator placeholder for manual/deep research refinement)
    works = tx.run("MATCH (w:MediaWork) WHERE w.wikidata_id IS NULL RETURN w.title AS title, w.media_id AS media_id")
    for record in works:
        title = record["title"]
        media_id = record.get("media_id")
        q_id = get_wikidata_info(title)
        if q_id:
            # Check if Q-ID already exists for another MediaWork (uniqueness constraint)
            existing = tx.run("MATCH (w:MediaWork {wikidata_id: $q_id}) RETURN w.title AS existing_title, w.media_id AS existing_id LIMIT 1", q_id=q_id).single()
            if existing:
                print(f"⚠️  CONFLICT: {title} ({media_id}) -> {q_id} already assigned to {existing['existing_title']} ({existing.get('existing_id')})")
            else:
                if media_id:
                    tx.run("MATCH (w:MediaWork {media_id: $media_id}) SET w.wikidata_id = $q_id", media_id=media_id, q_id=q_id)
                else:
                    tx.run("MATCH (w:MediaWork {title: $title}) WHERE w.wikidata_id IS NULL SET w.wikidata_id = $q_id", title=title, q_id=q_id)
                print(f"Updated Work: {title} -> {q_id}")

driver = GraphDatabase.driver(os.getenv("NEO4J_URI"), auth=(os.getenv("NEO4J_USERNAME"), os.getenv("NEO4J_PASSWORD")))
with driver.session() as session:
    session.execute_write(backfill_metadata)
driver.close()