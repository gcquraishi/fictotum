import json
import time
import ssl
from SPARQLWrapper import SPARQLWrapper, JSON

def harvest_centuries():
    # Bypass SSL verification
    ssl._create_default_https_context = ssl._create_unverified_context
    sparql = SPARQLWrapper("https://query.wikidata.org/sparql")
    
    # 1. Get Centuries 10th BC -> 21st AD
    # We'll fetch all centuries and filter in python or query logic
    print("⏳ Fetching Century Q-IDs...")
    
    # This query fetches centuries and orders them by start time
    century_query = """
    SELECT ?century ?centuryLabel ?start WHERE {
      ?century wdt:P31 wd:Q578;   # Instance of Century
               wdt:P580 ?start.   # Start time
      
      # Filter for range roughly -1000 to 2050
      FILTER(YEAR(?start) >= -1000 && YEAR(?start) <= 2050)
      
      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    }
    ORDER BY ?start
    """
    
    sparql.setQuery(century_query)
    sparql.setReturnFormat(JSON)
    results = sparql.query().convert()
    
    centuries = results["results"]["bindings"]
    print(f"✅ Found {len(centuries)} centuries to harvest.")
    
    all_works = []
    
    # 2. Iterate and Harvest
    for cent in centuries:
        century_qid = cent["century"]["value"].split("/")[-1]
        century_name = cent["centuryLabel"]["value"]
        
        print(f"   Searching works set in: {century_name} ({century_qid})...")
        
        # Query for works set in this specific century
        work_query = f"""
        SELECT ?work ?workLabel ?typeLabel ?date WHERE {{
          # Work is instance of Creative Work (broadly)
          VALUES ?type {{ wd:Q7725634 wd:Q11424 wd:Q5398426 wd:Q7889 }}
          ?work wdt:P31 ?type.
          
          # Narrative Period is this century
          ?work wdt:P2408 wd:{century_qid}.
          
          OPTIONAL {{ ?work wdt:P577 ?date. }}
          
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }}
        }}
        LIMIT 20
        """
        
        sparql.setQuery(work_query)
        sparql.setReturnFormat(JSON)
        
        try:
            work_results = sparql.query().convert()
            bindings = work_results["results"]["bindings"]
            
            for item in bindings:
                work_qid = item["work"]["value"].split("/")[-1]
                title = item["workLabel"]["value"]
                
                # Deduplicate
                if any(w['wikidata_id'] == work_qid for w in all_works):
                    continue
                    
                year = None
                date_str = item.get("date", {}).get("value")
                if date_str:
                    try:
                        year = int(date_str.split("-")[0])
                    except:
                        pass

                all_works.append({
                    "wikidata_id": work_qid,
                    "title": title,
                    "release_year": year,
                    "media_type": item.get("typeLabel", {}).get("value", "Unknown"),
                    "era_set_in": century_name,
                    "source": "century_harvest"
                })
            
            print(f"      + Found {len(bindings)} works.")
            
        except Exception as e:
            print(f"      ❌ Error harvesting {century_name}: {e}")
            
        # Polite delay
        time.sleep(0.5)

    # 3. Save
    with open("century_harvest.json", "w") as f:
        json.dump(all_works, f, indent=2)
        
    print(f"💾 Saved {len(all_works)} total works to 'century_harvest.json'.")

if __name__ == "__main__":
    harvest_centuries()
