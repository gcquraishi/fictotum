#!/usr/bin/env python3
"""
Wikidata Search & Validation Module

Provides robust Q-ID lookup and validation for MediaWork entities.
Used by both maintenance scripts and live API endpoints.
"""

import requests
import difflib
from typing import Optional, List, Dict
import time


class WikidataSearchError(Exception):
    """Raised when Wikidata search fails"""
    pass


def search_wikidata_for_work(
    title: str,
    creator: Optional[str] = None,
    year: Optional[int] = None,
    media_type: Optional[str] = None,
    timeout: int = 10
) -> Optional[Dict]:
    """
    Search Wikidata for a work and return best match with Q-ID

    Args:
        title: Work title (required)
        creator: Creator name (highly recommended)
        year: Release/publication year
        media_type: One of: FILM, BOOK, TV_SERIES, GAME, etc.
        timeout: Request timeout in seconds

    Returns:
        Dict with keys: qid, title, similarity, confidence
        None if no good match found

    Example:
        >>> search_wikidata_for_work("War and Peace", "Leo Tolstoy", 1869, "BOOK")
        {'qid': 'Q161531', 'title': 'War and Peace', 'similarity': 1.0, 'confidence': 'high'}
    """

    if not title:
        raise ValueError("Title is required")

    # Build search query
    search_terms = [title]
    if creator:
        search_terms.append(creator)
    if year:
        search_terms.append(str(year))

    search_query = " ".join(search_terms)

    try:
        # Use Wikidata search API
        url = "https://www.wikidata.org/w/api.php"
        params = {
            "action": "wbsearchentities",
            "search": search_query,
            "language": "en",
            "limit": 10,  # Get top 10 results
            "format": "json",
            "type": "item"
        }
        headers = {
            "User-Agent": "ChronosGraph/1.0 (https://github.com/chronosgraph; Q-ID Validation)"
        }

        response = requests.get(url, params=params, headers=headers, timeout=timeout)
        response.raise_for_status()
        data = response.json()

        if "search" not in data or len(data["search"]) == 0:
            return None

        # Score each result
        candidates = []
        for result in data["search"]:
            qid = result["id"]
            result_label = result.get("label", "")
            result_description = result.get("description", "")

            # Calculate title similarity
            similarity = difflib.SequenceMatcher(
                None,
                title.lower(),
                result_label.lower()
            ).ratio()

            # Bonus points for matching creator in description
            creator_bonus = 0
            if creator and creator.lower() in result_description.lower():
                creator_bonus = 0.2

            # Media type filtering (if we can determine from description)
            media_type_match = True
            if media_type:
                media_type_match = _matches_media_type(media_type, result_description)

            score = similarity + creator_bonus

            candidates.append({
                "qid": qid,
                "title": result_label,
                "description": result_description,
                "similarity": similarity,
                "score": score,
                "media_type_match": media_type_match
            })

        # Filter by media type if specified
        if media_type:
            type_matches = [c for c in candidates if c["media_type_match"]]
            if type_matches:
                candidates = type_matches

        # Sort by score
        candidates.sort(key=lambda x: x["score"], reverse=True)

        # Return best match if similarity is good enough
        best = candidates[0]

        # Confidence thresholds
        if best["score"] >= 0.9:
            confidence = "high"
        elif best["score"] >= 0.7:
            confidence = "medium"
        else:
            confidence = "low"

        # Only return if we have reasonable confidence
        if best["score"] >= 0.7:
            return {
                "qid": best["qid"],
                "title": best["title"],
                "description": best["description"],
                "similarity": best["similarity"],
                "score": best["score"],
                "confidence": confidence
            }

        return None

    except requests.RequestException as e:
        raise WikidataSearchError(f"Wikidata API request failed: {e}")


def _matches_media_type(media_type: str, description: str) -> bool:
    """Check if Wikidata description matches our media type"""
    description_lower = description.lower()

    type_keywords = {
        "FILM": ["film", "movie", "motion picture", "cinema"],
        "BOOK": ["book", "novel", "literature", "literary work"],
        "TV_SERIES": ["television series", "tv series", "tv show", "television program"],
        "GAME": ["video game", "game", "computer game"],
        "PLAY": ["play", "theatrical", "drama", "stage"],
        "COMIC": ["comic", "graphic novel", "manga"],
    }

    keywords = type_keywords.get(media_type, [])
    return any(keyword in description_lower for keyword in keywords)


def validate_qid(qid: str, expected_title: str, timeout: int = 10) -> Dict:
    """
    Validate that a Q-ID matches the expected work

    Args:
        qid: Wikidata Q-ID
        expected_title: Title we expect the Q-ID to represent
        timeout: Request timeout in seconds

    Returns:
        Dict with keys: valid (bool), wikidata_label (str), similarity (float), error (str)

    Example:
        >>> validate_qid("Q161531", "War and Peace")
        {'valid': True, 'wikidata_label': 'War and Peace', 'similarity': 1.0}
    """

    try:
        # Fetch entity from Wikidata
        url = "https://www.wikidata.org/w/api.php"
        params = {
            "action": "wbgetentities",
            "ids": qid,
            "props": "labels|descriptions",
            "languages": "en",
            "format": "json"
        }
        headers = {
            "User-Agent": "ChronosGraph/1.0 (https://github.com/chronosgraph; Q-ID Validation)"
        }

        response = requests.get(url, params=params, headers=headers, timeout=timeout)
        response.raise_for_status()
        data = response.json()

        if "entities" not in data or qid not in data["entities"]:
            return {
                "valid": False,
                "error": f"Q-ID {qid} not found in Wikidata"
            }

        entity = data["entities"][qid]

        # Check if entity exists (not deleted/missing)
        if "missing" in entity:
            return {
                "valid": False,
                "error": f"Q-ID {qid} is missing/deleted in Wikidata"
            }

        # Get label
        if "labels" not in entity or "en" not in entity["labels"]:
            return {
                "valid": False,
                "error": f"Q-ID {qid} has no English label"
            }

        wikidata_label = entity["labels"]["en"]["value"]
        description = entity.get("descriptions", {}).get("en", {}).get("value", "")

        # Calculate similarity
        similarity = difflib.SequenceMatcher(
            None,
            expected_title.lower(),
            wikidata_label.lower()
        ).ratio()

        # Validation threshold: 75% similarity
        is_valid = similarity >= 0.75

        return {
            "valid": is_valid,
            "wikidata_label": wikidata_label,
            "description": description,
            "similarity": similarity,
            "qid": qid
        }

    except requests.RequestException as e:
        return {
            "valid": False,
            "error": f"Failed to fetch Q-ID {qid}: {e}"
        }


def search_by_creator(creator_name: str, limit: int = 50, timeout: int = 10) -> List[Dict]:
    """
    Search for all works by a creator in Wikidata

    This is what the /api/wikidata/by-creator endpoint should use.

    Args:
        creator_name: Name of creator (author, director, etc.)
        limit: Maximum number of works to return
        timeout: Request timeout in seconds

    Returns:
        List of dicts with keys: qid, title, year, type
    """

    try:
        # Use Wikidata SPARQL endpoint
        sparql_query = f"""
        SELECT DISTINCT ?work ?workLabel ?year ?typeLabel WHERE {{
          ?creator ?label "{creator_name}"@en .
          ?work wdt:P50|wdt:P57|wdt:P170|wdt:P178 ?creator .
          OPTIONAL {{ ?work wdt:P577 ?publicationDate . BIND(YEAR(?publicationDate) AS ?year) }}
          OPTIONAL {{ ?work wdt:P31 ?type }}
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en" }}
        }}
        LIMIT {limit}
        """

        url = "https://query.wikidata.org/sparql"
        headers = {
            "User-Agent": "ChronosGraph/1.0 (https://github.com/chronosgraph; Creator Search)",
            "Accept": "application/json"
        }

        response = requests.get(
            url,
            params={"query": sparql_query, "format": "json"},
            headers=headers,
            timeout=timeout
        )
        response.raise_for_status()
        data = response.json()

        works = []
        for result in data.get("results", {}).get("bindings", []):
            qid = result["work"]["value"].split("/")[-1]
            title = result.get("workLabel", {}).get("value", "")
            year = result.get("year", {}).get("value")
            work_type = result.get("typeLabel", {}).get("value", "literary work")

            if year:
                year = int(year)

            works.append({
                "qid": qid,
                "title": title,
                "year": year,
                "type": work_type
            })

        return works

    except requests.RequestException as e:
        raise WikidataSearchError(f"Wikidata SPARQL query failed: {e}")


# Rate limiting helper
_last_request_time = 0
_min_request_interval = 0.5  # 500ms between requests


def rate_limited_request(func):
    """Decorator to rate-limit Wikidata requests"""
    def wrapper(*args, **kwargs):
        global _last_request_time

        # Wait if needed
        elapsed = time.time() - _last_request_time
        if elapsed < _min_request_interval:
            time.sleep(_min_request_interval - elapsed)

        result = func(*args, **kwargs)
        _last_request_time = time.time()

        return result

    return wrapper


# Apply rate limiting to public functions
search_wikidata_for_work = rate_limited_request(search_wikidata_for_work)
validate_qid = rate_limited_request(validate_qid)
