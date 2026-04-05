#!/usr/bin/env python3
"""
Test the exact API call that's failing
"""

import os
from dotenv import load_dotenv
from neo4j import GraphDatabase
import json

# Load environment variables
load_dotenv()
uri = os.getenv('NEO4J_URI', 'neo4j+ssc://c78564a4.databases.neo4j.io')
username = os.getenv('NEO4J_USERNAME', 'neo4j')
password = os.getenv('NEO4J_PASSWORD')

driver = GraphDatabase.driver(uri, auth=(username, password))

print("="*80)
print("TESTING APPEARANCE CREATION WITH EXACT API PARAMETERS")
print("="*80)

# These should be the exact parameters the form is sending
figure_id = "Q38370"  # Henry VIII's canonical_id
media_id = "MW_1463"  # The Mirror & the Light's media_id (after migration)
user_email = "george.quraishi@gmail.com"
sentiment_tags = ["complex"]  # Default tag
tag_metadata = {
    "common": ["complex"],
    "custom": []
}
legacy_sentiment = "complex"
role_description = ""
is_protagonist = False
actor_name = None

print(f"\nParameters:")
print(f"  figureId: {figure_id}")
print(f"  mediaId: {media_id}")
print(f"  userEmail: {user_email}")
print(f"  sentimentTags: {sentiment_tags}")
print(f"  roleDescription: '{role_description}'")
print(f"  isProtagonist: {is_protagonist}")
print(f"  actorName: {actor_name}")

with driver.session() as session:
    print("\nExecuting the EXACT Cypher query from the API...")

    query = """
      MATCH (f:HistoricalFigure {canonical_id: $figureId})
      MATCH (m:MediaWork)
      WHERE m.media_id = $mediaId OR m.wikidata_id = $mediaId
      MATCH (u:User {email: $userEmail})
      MERGE (f)-[r:APPEARS_IN]->(m)
      ON CREATE SET
        r.sentiment_tags = $sentimentTags,
        r.tag_metadata = $tagMetadata,
        r.sentiment = $legacySentiment,
        r.role_description = $roleDescription,
        r.is_protagonist = $isProtagonist,
        r.actor_name = $actorName,
        r.created_at = timestamp(),
        r.created_by = u.email,
        r.created_by_name = u.name
      ON MATCH SET
        r.sentiment_tags = $sentimentTags,
        r.tag_metadata = $tagMetadata,
        r.sentiment = $legacySentiment,
        r.role_description = $roleDescription,
        r.is_protagonist = $isProtagonist,
        r.actor_name = $actorName,
        r.updated_at = timestamp(),
        r.updated_by = u.email,
        r.updated_by_name = u.name
      RETURN r
    """

    try:
        result = session.run(query, {
            'figureId': figure_id,
            'mediaId': media_id,
            'userEmail': user_email,
            'sentimentTags': sentiment_tags,
            'tagMetadata': tag_metadata,
            'legacySentiment': legacy_sentiment,
            'roleDescription': role_description,
            'isProtagonist': is_protagonist,
            'actorName': actor_name,
        })

        record = result.single()
        if record:
            print("\n✓✓✓ SUCCESS! Appearance created/updated.")
            rel = record['r']
            print(f"\nRelationship properties:")
            for key, value in rel.items():
                print(f"  {key}: {value}")
        else:
            print("\n✗ Query returned no results")

    except Exception as e:
        print(f"\n✗✗✗ ERROR: {type(e).__name__}")
        print(f"Message: {str(e)}")
        import traceback
        print("\nFull traceback:")
        traceback.print_exc()

print("\n" + "="*80)

driver.close()
