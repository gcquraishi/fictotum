import json
import os
from neo4j import GraphDatabase

# Load harvested data
with open("harvested_works.json", "r") as f:
    works = json.load(f)

# Connect to Neo4j
# Force neo4j+ssc to bypass SSL verification issues
uri = "neo4j+ssc://c78564a4.databases.neo4j.io"
user = os.getenv("NEO4J_USERNAME", "neo4j")
pwd = os.getenv("NEO4J_PASSWORD", "ybSiNRTV9UxUb6PQuANZEeqECn2vz3ozXYiNzkdcMBk")

driver = GraphDatabase.driver(uri, auth=(user, pwd))

def ingest_work(tx, work):
    query = """
    MERGE (m:MediaWork {wikidata_id: $qid})
    SET m.title = $title,
        m.release_year = $year,
        m.media_type = $type,
        m.source = "wikidata_harvest"
    """
    tx.run(query, qid=work["wikidata_id"], title=work["title"], year=work["release_year"], type=work["type"])

print(f"🚀 Bulk Ingesting {len(works)} works into Neo4j...")

with driver.session() as session:
    for work in works:
        session.execute_write(ingest_work, work)

driver.close()
print("✅ Bulk ingestion complete.")
