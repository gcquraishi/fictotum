import json
import time
import ssl
from SPARQLWrapper import SPARQLWrapper, JSON

def harvest_rome_data():
    # Bypass SSL verification
    ssl._create_default_https_context = ssl._create_unverified_context
    
    sparql = SPARQLWrapper("https://query.wikidata.org/sparql")
    
    # Query: Find works set in Ancient Rome/Roman Empire
    query = """
    SELECT ?work ?workLabel ?date ?typeLabel WHERE {
      # Instances of: Book, Film, TV Series, Video Game
      VALUES ?type { wd:Q7725634 wd:Q11424 wd:Q5398426 wd:Q7889 }
      ?work wdt:P31 ?type .
      
      # Set in: Ancient Rome OR Subject: Ancient Rome/Roman Empire
      { ?work wdt:P840 wd:Q1747689 . } 
      UNION 
      { ?work wdt:P921 wd:Q1747689 . }
      UNION
      { ?work wdt:P921 wd:Q2277 . }
      
      # Get publication date
      OPTIONAL { ?work wdt:P577 ?date . }
      
      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    }
    LIMIT 2000
    """
    
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    
    print("📡 Sending query to Wikidata (this may take 10-20 seconds)...")
    try:
        results = sparql.query().convert()
    except Exception as e:
        print(f"❌ Error querying Wikidata: {e}")
        return

    bindings = results["results"]["bindings"]
    print(f"✅ Harvested {len(bindings)} raw items.")
    
    harvested_data = []
    
    for item in bindings:
        work_qid = item["work"]["value"].split("/")[-1]
        title = item["workLabel"]["value"]
        date_str = item.get("date", {}).get("value")
        
        # Basic date parsing (just get the year)
        year = None
        if date_str:
            try:
                year = int(date_str.split("-")[0])
            except:
                pass
                
        entry = {
            "wikidata_id": work_qid,
            "title": title,
            "release_year": year,
            "type": item.get("typeLabel", {}).get("value", "Unknown")
        }
        harvested_data.append(entry)
        
    # Save to file
    with open("harvested_works.json", "w") as f:
        json.dump(harvested_data, f, indent=2)
        
    print(f"💾 Saved {len(harvested_data)} works to 'harvested_works.json'.")

if __name__ == "__main__":
    harvest_rome_data()
