import json
import ssl
from SPARQLWrapper import SPARQLWrapper, JSON

def harvest_davis_works():
    ssl._create_default_https_context = ssl._create_unverified_context
    sparql = SPARQLWrapper("https://query.wikidata.org/sparql")
    
    # Query: Works by Lindsey Davis (Q437516)
    query = """
    SELECT ?work ?workLabel ?date ?typeLabel WHERE {
      ?work wdt:P50 wd:Q437516 .
      ?work wdt:P31 ?type .
      OPTIONAL { ?work wdt:P577 ?date . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
    }
    """
    
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    results = sparql.query().convert()
    
    works = []
    for item in results["results"]["bindings"]:
        works.append({
            "wikidata_id": item["work"]["value"].split("/")[-1],
            "title": item["workLabel"]["value"],
            "release_year": item.get("date", {}).get("value", "")[:4],
            "type": item.get("typeLabel", {}).get("value", "Book")
        })
        
    with open("davis_harvest.json", "w") as f:
        json.dump(works, f, indent=2)
    
    print(f"Harvested {len(works)} works by Lindsey Davis.")

if __name__ == "__main__":
    harvest_davis_works()
