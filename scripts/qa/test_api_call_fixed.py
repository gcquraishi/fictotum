#!/usr/bin/env python3
"""
Test the FIXED API call
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
print("TESTING FIXED APPEARANCE CREATION")
print("="*80)

# These should be the exact parameters the form is sending
figure_id = "Q38370"  # Henry VIII's canonical_id
media_id = "MW_1463"  # The Mirror & the Light's media_id
user_email = "george.quraishi@gmail.com"
sentiment_tags = ["complex"]
# Convert to JSON string like the API now does
tag_metadata = json.dumps({
    "common": ["complex"],
    "custom": []
})
legacy_sentiment = "complex"
role_description = ""
is_protagonist = False
actor_name = None

print(f"\nParameters:")
print(f"  figureId: {figure_id}")
print(f"  mediaId: {media_id}")
print(f"  tag_metadata (as JSON string): {tag_metadata}")

with driver.session() as session:
    print("\nExecuting query with JSON.stringify(tagMetadata)...")

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
            'tagMetadata': tag_metadata,  # Now a JSON string
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

print("\n" + "="*80)

driver.close()
