"""
Seed script for initial Location and Era data.

Usage:
python scripts/seed_locations_and_eras.py
"""

import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

# Sample locations data
LOCATIONS = [
    {
        "location_id": "location-london",
        "name": "London",
        "location_type": "city",
        "wikidata_id": "Q84",
        "parent_location": "location-england",
        "coordinates": {"latitude": 51.5074, "longitude": -0.1278},
        "description": "Capital city of England and the United Kingdom"
    },
    {
        "location_id": "location-england",
        "name": "England",
        "location_type": "country",
        "wikidata_id": "Q21",
        "description": "Country that is part of the United Kingdom"
    },
    {
        "location_id": "location-venice",
        "name": "Venice",
        "location_type": "city",
        "wikidata_id": "Q641",
        "parent_location": "location-italy",
        "coordinates": {"latitude": 45.4408, "longitude": 12.3155},
        "description": "City in northeastern Italy, built on a lagoon"
    },
    {
        "location_id": "location-italy",
        "name": "Italy",
        "location_type": "country",
        "wikidata_id": "Q38",
        "description": "Country in southern Europe"
    },
    {
        "location_id": "location-midlands",
        "name": "The Midlands",
        "location_type": "region",
        "wikidata_id": "Q17051",
        "parent_location": "location-england",
        "description": "Region in central England"
    },
    {
        "location_id": "location-rome",
        "name": "Rome",
        "location_type": "city",
        "wikidata_id": "Q220",
        "parent_location": "location-italy",
        "coordinates": {"latitude": 41.9028, "longitude": 12.4964},
        "description": "Capital of Italy and the Roman Empire"
    },
    {
        "location_id": "location-ancient-rome",
        "name": "Ancient Rome",
        "location_type": "fictional_place",
        "wikidata_id": "Q1024",
        "description": "The Roman Empire in antiquity"
    },
    {
        "location_id": "location-france",
        "name": "France",
        "location_type": "country",
        "wikidata_id": "Q142",
        "description": "Country in western Europe"
    },
    {
        "location_id": "location-paris",
        "name": "Paris",
        "location_type": "city",
        "wikidata_id": "Q90",
        "parent_location": "location-france",
        "coordinates": {"latitude": 48.8566, "longitude": 2.3522},
        "description": "Capital of France"
    },
    {
        "location_id": "location-greece",
        "name": "Ancient Greece",
        "location_type": "fictional_place",
        "description": "Ancient Greek civilization and city-states"
    }
]

# Sample eras data
ERAS = [
    {
        "era_id": "era-regency",
        "name": "Regency Era",
        "start_year": 1811,
        "end_year": 1820,
        "era_type": "literary_period",
        "description": "Period of English history and literature marked by the Regency of George IV"
    },
    {
        "era_id": "era-victorian",
        "name": "Victorian Era",
        "start_year": 1837,
        "end_year": 1901,
        "era_type": "historical_period",
        "description": "Era of British history during Queen Victoria's reign"
    },
    {
        "era_id": "era-edwardian",
        "name": "Edwardian Era",
        "start_year": 1901,
        "end_year": 1910,
        "era_type": "historical_period",
        "description": "Period of British history during the reign of King Edward VII"
    },
    {
        "era_id": "era-roman-republic",
        "name": "Roman Republic",
        "start_year": -509,
        "end_year": -27,
        "era_type": "historical_period",
        "wikidata_id": "Q1015",
        "description": "Period of ancient Roman civilization as a republic"
    },
    {
        "era_id": "era-roman-empire",
        "name": "Roman Empire",
        "start_year": -27,
        "end_year": 476,
        "era_type": "historical_period",
        "wikidata_id": "Q12548",
        "description": "Period of ancient Roman civilization as an empire"
    },
    {
        "era_id": "era-elizabethan",
        "name": "Elizabethan Era",
        "start_year": 1558,
        "end_year": 1603,
        "era_type": "historical_period",
        "wikidata_id": "Q4280076",
        "description": "Period of English history during the reign of Queen Elizabeth I"
    },
    {
        "era_id": "era-renaissance",
        "name": "Renaissance",
        "start_year": 1300,
        "end_year": 1600,
        "era_type": "historical_period",
        "wikidata_id": "Q4695",
        "description": "Cultural movement marking the transition from medieval to modern Europe"
    },
    {
        "era_id": "era-medieval",
        "name": "Medieval Period",
        "start_year": 500,
        "end_year": 1500,
        "era_type": "historical_period",
        "wikidata_id": "Q12554",
        "description": "Historical period in Europe between antiquity and the Renaissance"
    },
    {
        "era_id": "era-ancient-egypt",
        "name": "Ancient Egypt",
        "start_year": -3100,
        "end_year": -30,
        "era_type": "historical_period",
        "wikidata_id": "Q11768",
        "description": "Ancient civilization along the Nile River"
    },
    {
        "era_id": "era-greek-antiquity",
        "name": "Classical Greece",
        "start_year": -800,
        "end_year": -146,
        "era_type": "historical_period",
        "wikidata_id": "Q11772",
        "description": "Period of ancient Greek civilization"
    }
]

def seed_data():
    """Seed initial Location and Era data into Neo4j."""
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))

    with driver.session() as session:
        print("Seeding locations...")
        for loc in LOCATIONS:
            # Only pass non-None values to Neo4j
            params = {k: v for k, v in loc.items() if v is not None}
            query = """
            MERGE (l:Location {location_id: $location_id})
            SET l.name = $name,
                l.location_type = $location_type,
                l.wikidata_id = $wikidata_id,
                l.parent_location = $parent_location,
                l.coordinates = $coordinates,
                l.description = $description
            """
            session.run(query, **params)
            print(f"  ✓ {loc['name']}")

        print("\nSeeding eras...")
        for era in ERAS:
            # Only pass non-None values to Neo4j
            params = {k: v for k, v in era.items() if v is not None}
            query = """
            MERGE (e:Era {era_id: $era_id})
            SET e.name = $name,
                e.start_year = $start_year,
                e.end_year = $end_year,
                e.era_type = $era_type,
                e.wikidata_id = $wikidata_id,
                e.parent_era = $parent_era,
                e.description = $description
            """
            session.run(query, **params)
            print(f"  ✓ {era['name']}")

    print("\n✅ Seed data complete!")
    driver.close()

if __name__ == "__main__":
    seed_data()
