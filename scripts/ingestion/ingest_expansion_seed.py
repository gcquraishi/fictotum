import json, os, re
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

def to_canonical_id(name):
    """Transform a figure name to canonical_id format.
    E.g., 'Octavian (Augustus)' -> 'octavian_augustus'
    """
    # Remove parentheses but keep their content
    canonical = re.sub(r'[()]', '', name)
    # Replace spaces and hyphens with underscores
    canonical = re.sub(r'[\s\-]+', '_', canonical)
    # Remove any non-alphanumeric characters except underscores
    canonical = re.sub(r'[^\w]', '', canonical)
    # Collapse multiple underscores and strip leading/trailing
    canonical = re.sub(r'_+', '_', canonical).strip('_')
    return canonical.lower()

def ingest_seed(tx, data):
    query = """
    UNWIND $batch AS item
    MERGE (w:MediaWork {wikidata_id: item.wikidata_id})
    ON CREATE SET
        w.title = item.title,
        w.type = item.media_type,
        w.year = item.release_year,
        w.historiography = item.brief_historiography_note

    MERGE (c:Creator {wikidata_id: item.creator_wikidata_id})
    ON CREATE SET c.name = item.creator

    MERGE (c)-[:CREATED]->(w)

    WITH w, item
    UNWIND item.key_historical_figures AS figure
    MERGE (f:HistoricalFigure {canonical_id: figure.canonical_id})
    ON CREATE SET f.name = figure.name
    MERGE (f)-[:PORTRAYED_IN]->(w)
    """
    # Transform figure names to objects with canonical_id
    for item in data:
        item['key_historical_figures'] = [
            {'name': name, 'canonical_id': to_canonical_id(name)}
            for name in item['key_historical_figures']
        ]
    tx.run(query, batch=data)

with open('expansion_seed.json', 'r') as f:
    seed_data = json.load(f)

driver = GraphDatabase.driver(os.getenv("NEO4J_URI"), auth=(os.getenv("NEO4J_USERNAME"), os.getenv("NEO4J_PASSWORD")))
with driver.session() as session:
    session.execute_write(ingest_seed, seed_data)
driver.close()
print("Ingestion Complete.")