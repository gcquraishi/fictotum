"""
Verification script for CREATED_BY relationships
"""
import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

def verify():
    load_dotenv()

    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    if uri.startswith("neo4j+s://"):
        uri = uri.replace("neo4j+s://", "neo4j+ssc://")
    username = os.getenv("NEO4J_USERNAME", "neo4j")
    password = os.getenv("NEO4J_PASSWORD")

    driver = GraphDatabase.driver(uri, auth=(username, password))

    print("=" * 70)
    print("CREATED_BY Relationship Verification")
    print("=" * 70)

    with driver.session() as session:
        # 1. Verify Agent nodes exist
        print("\n1. Agent nodes:")
        result = session.run("MATCH (a:Agent) RETURN a.name, id(a)")
        agents = list(result)
        for record in agents:
            print(f"   - {record['a.name']} (ID: {record['id(a)']})")

        # 2. Verify CREATED_BY relationships for HistoricalFigures
        print("\n2. Sample CREATED_BY relationships for HistoricalFigures:")
        result = session.run("""
            MATCH (f:HistoricalFigure)-[:CREATED_BY]->(a:Agent)
            RETURN f.name, a.name
            LIMIT 5
        """)
        for record in result:
            print(f"   - {record['f.name']} → {record['a.name']}")

        # 3. Verify CREATED_BY relationships for MediaWorks
        print("\n3. Sample CREATED_BY relationships for MediaWorks:")
        result = session.run("""
            MATCH (m:MediaWork)-[:CREATED_BY]->(a:Agent)
            RETURN m.title, a.name
            LIMIT 5
        """)
        for record in result:
            print(f"   - {record['m.title']} → {record['a.name']}")

        # 4. Verify CREATED_BY relationships for FictionalCharacters
        print("\n4. Sample CREATED_BY relationships for FictionalCharacters:")
        result = session.run("""
            MATCH (c:FictionalCharacter)-[:CREATED_BY]->(a:Agent)
            RETURN c.name, a.name
            LIMIT 5
        """)
        for record in result:
            print(f"   - {record['c.name']} → {record['a.name']}")

        # 5. Count all CREATED_BY relationships
        print("\n5. Total CREATED_BY relationships:")
        result = session.run("""
            MATCH ()-[:CREATED_BY]->()
            RETURN count(*) AS totalCreatedByRelationships
        """)
        total = result.single()['totalCreatedByRelationships']
        print(f"   - Total: {total}")

        # 6. Count by node type
        print("\n6. CREATED_BY relationships by node type:")

        result = session.run("""
            MATCH (f:HistoricalFigure)-[:CREATED_BY]->()
            RETURN count(*) AS count
        """)
        fig_count = result.single()['count']
        print(f"   - HistoricalFigures: {fig_count}")

        result = session.run("""
            MATCH (m:MediaWork)-[:CREATED_BY]->()
            RETURN count(*) AS count
        """)
        media_count = result.single()['count']
        print(f"   - MediaWorks: {media_count}")

        result = session.run("""
            MATCH (c:FictionalCharacter)-[:CREATED_BY]->()
            RETURN count(*) AS count
        """)
        char_count = result.single()['count']
        print(f"   - FictionalCharacters: {char_count}")

    driver.close()
    print("\n" + "=" * 70)
    print("✅ Verification Complete")
    print("=" * 70)

if __name__ == "__main__":
    verify()
