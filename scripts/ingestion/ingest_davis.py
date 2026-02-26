import json
import os
from neo4j import GraphDatabase

with open("../../data/davis_harvest.json", "r") as f:
    works = json.load(f)

uri = "neo4j+ssc://c78564a4.databases.neo4j.io"
user = os.getenv("NEO4J_USERNAME", "neo4j")
pwd = os.getenv("NEO4J_PASSWORD", "ybSiNRTV9UxUb6PQuANZEeqECn2vz3ozXYiNzkdcMBk")

driver = GraphDatabase.driver(uri, auth=(user, pwd))

def ingest_work(tx, work):
    # Skip if title is generic or missing
    if not work.get("title"): return
    
    # Handle missing year
    year = int(work["release_year"]) if work.get("release_year") else None

    query = """
    MERGE (m:MediaWork {wikidata_id: $qid})
    SET m.title = $title,
        m.release_year = $year,
        m.media_type = "Book",
        m.creator = "Lindsey Davis",
        m.source = "davis_harvest"
    """
    tx.run(query, qid=work["wikidata_id"], title=work["title"], year=year)

print(f"🚀 Ingesting {len(works)} Lindsey Davis works...")
with driver.session() as session:
    for work in works:
        session.execute_write(ingest_work, work)
print("✅ Done.")
driver.close()
