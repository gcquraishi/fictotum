# Kevin Bacon to Francis Bacon: Database Implementation Guide
## ChronosGraph Neo4j Integration Plan

---

## Overview

This document provides a complete Neo4j Cypher implementation plan for storing and querying the Kevin Bacon to Francis Bacon network, including all confirmed films, documentaries, and biographical connections.

---

## Phase 1: Create Media Work Nodes

### 1.1 Kevin Bacon Films

```cypher
// A Few Good Men (1992)
CREATE (m_afew:MediaWork {
  title: "A Few Good Men",
  release_year: 1992,
  wikidata_id: "Q104257",
  genre: "Military Legal Drama",
  director: "Rob Reiner",
  plot_summary: "Military court-martial involving accused Marines and their defense lawyers",
  runtime_minutes: 119
})

// Apollo 13 (1995)
CREATE (m_apollo:MediaWork {
  title: "Apollo 13",
  release_year: 1995,
  wikidata_id: "Q112384",
  genre: "Historical Space Drama",
  director: "Ron Howard",
  plot_summary: "True story of aborted Apollo 13 Moon mission and safe return of crew",
  runtime_minutes: 140,
  historical_event: "Apollo 13 Space Mission (1970)"
})

// JFK (1991)
CREATE (m_jfk:MediaWork {
  title: "JFK",
  release_year: 1991,
  wikidata_id: "Q102138",
  genre: "Political Thriller/Historical Conspiracy Drama",
  director: "Oliver Stone",
  plot_summary: "Exploration of JFK assassination conspiracy theories and Jim Garrison investigation",
  runtime_minutes: 189,
  historical_event: "JFK Assassination Investigation",
  controversial: true
})

// Mystic River (2003)
CREATE (m_mystic:MediaWork {
  title: "Mystic River",
  release_year: 2003,
  wikidata_id: "Q327056",
  genre: "Crime Drama/Mystery",
  director: "Clint Eastwood",
  plot_summary: "Three childhood friends reunited when one's daughter is murdered",
  runtime_minutes: 138,
  awards: "6 Oscar nominations including Best Picture; Best Actor (Penn), Best Supporting Actor (Robbins)"
})

// Jayne Mansfield's Car (2012)
CREATE (m_jayne:MediaWork {
  title: "Jayne Mansfield's Car",
  release_year: 2012,
  wikidata_id: "[to-be-verified]",
  genre: "Drama",
  director: "Billy Bob Thornton",
  plot_summary: "English family meets American family after wife's death and return to native country",
  runtime_minutes: 108
})
```

### 1.2 Derek Jacobi Films and TV

```cypher
// I, Claudius (1976 - BBC Television)
CREATE (m_claudius:MediaWork {
  title: "I, Claudius",
  release_year: 1976,
  wikidata_id: "Q74006",
  genre: "Historical Drama Television",
  director: "Herbert Wise",
  network: "BBC",
  plot_summary: "Roman emperor Claudius recounts his rise to power and reign",
  runtime_minutes: 780,
  episode_count: 13,
  historical_period: "Ancient Rome (41-54 CE)",
  accolades: "BAFTA Award for Best Actor (Derek Jacobi)"
})

// Cadfael (1995-1999 - PBS Television)
CREATE (m_cadfael:MediaWork {
  title: "Cadfael",
  release_year: 1995,
  wikidata_id: "[PBS-series]",
  genre: "Medieval Mystery Television",
  network: "PBS",
  plot_summary: "12th-century Benedictine monk and former crusader solves mysteries",
  runtime_minutes: 3300,
  episode_count: 81,
  historical_period: "Medieval Britain (12th century)",
  based_on: "Ellis Peters novels"
})

// Hamlet (1996 - Kenneth Branagh)
CREATE (m_hamlet:MediaWork {
  title: "Hamlet",
  release_year: 1996,
  wikidata_id: "Q116477",
  genre: "Shakespeare Adaptation",
  director: "Kenneth Branagh",
  plot_summary: "Uncut version of Shakespeare's Danish prince seeking revenge for father's murder",
  runtime_minutes: 242,
  historical_period: "Medieval Denmark",
  notable_aspect: "First complete unabridged theatrical version",
  ensemble_cast: true
})

// Love Is the Devil: Study for a Portrait of Francis Bacon (1998)
CREATE (m_lovedevil:MediaWork {
  title: "Love Is the Devil: Study for a Portrait of Francis Bacon",
  release_year: 1998,
  wikidata_id: "Q2520891",
  genre: "Biographical Drama",
  director: "John Maybury",
  plot_summary: "Fictional biography of painter Francis Bacon and his relationship with George Dyer",
  runtime_minutes: 105,
  country: "United Kingdom",
  accolades: "Michael Powell Award (Best New British Feature), British Performance Award",
  festival: "Edinburgh International Film Festival (1998)"
})
```

### 1.3 Francis Bacon Documentaries

```cypher
// Francis Bacon and the Brutality of Fact (1985)
CREATE (m_brutality:MediaWork {
  title: "Francis Bacon and the Brutality of Fact",
  release_year: 1985,
  wikidata_id: "Q1832355",
  genre: "Documentary/Art History",
  director: "[art documentary]",
  plot_summary: "Interview and exploration of painter Francis Bacon's artistic philosophy and technique",
  runtime_minutes: 45,
  key_participant: "David Sylvester (art critic/interviewer)"
})

// Francis Bacon (1988 - Documentary)
CREATE (m_francis88:MediaWork {
  title: "Francis Bacon",
  release_year: 1988,
  wikidata_id: "Q297899",
  genre: "Documentary/Artist Interview",
  director: "David Hinton",
  plot_summary: "Conversation between painter Francis Bacon and interviewer Melvyn Bragg",
  runtime_minutes: 52,
  key_participant: "Melvyn Bragg (BBC interviewer)"
})

// Francis Bacon: A Brush with Violence (2017 - BBC)
CREATE (m_brushviolence:MediaWork {
  title: "Francis Bacon: A Brush with Violence",
  release_year: 2017,
  wikidata_id: "Q6465248",
  genre: "Documentary/Biography",
  broadcaster: "BBC",
  plot_summary: "Retrospective examination of painter Francis Bacon's life and violent artistic style",
  runtime_minutes: 80,
  key_participants: [
    "Damien Hirst (artist)",
    "Grey Gowrie (patron)",
    "Maggi Hambling (artist)",
    "Marianne Faithfull (musician/witness)",
    "Garech Browne",
    "Alexander Gowrie"
  ]
})

// Francis Bacon: The Outsider (2022 - RTÉ/Arena)
CREATE (m_outsider:MediaWork {
  title: "Francis Bacon: The Outsider",
  release_year: 2022,
  wikidata_id: "Q24381442",
  genre: "Documentary/Biography",
  broadcaster: "RTÉ One",
  presenter: "Adam Clayton (U2 bassist)",
  plot_summary: "Exploration of painter Francis Bacon's connection to Ireland, retracing 1929 journey",
  runtime_minutes: 75,
  theme: "Artist's relationship with country of origin"
})
```

---

## Phase 2: Create Historical Figure Nodes

### 2.1 Contemporary Actors

```cypher
// Kevin Bacon
CREATE (p_kbacon:HistoricalFigure {
  canonical_id: "kevin_bacon_actor",
  name: "Kevin Bacon",
  is_fictional: false,
  birth_year: 1958,
  era: "Contemporary (1958-present)",
  profession: "Actor, Producer, Director",
  notable_works: ["Footloose", "A Few Good Men", "Apollo 13", "JFK", "Mystic River"],
  biography: "American actor known for diverse roles in films and television"
})

// Jack Lemmon
CREATE (p_jlemmon:HistoricalFigure {
  canonical_id: "jack_lemmon_actor",
  name: "Jack Lemmon",
  is_fictional: false,
  birth_year: 1925,
  death_year: 2001,
  era: "20th Century (1925-2001)",
  profession: "Actor",
  notable_works: ["The Odd Couple", "Grumpy Old Men", "JFK", "Hamlet (1996)"],
  biography: "Legendary American actor with extensive theater and film career"
})

// Derek Jacobi
CREATE (p_djacabi:HistoricalFigure {
  canonical_id: "derek_jacobi_actor",
  name: "Derek Jacobi",
  is_fictional: false,
  birth_year: 1938,
  era: "Contemporary (1938-present)",
  profession: "Actor, Theater Director, Producer",
  notable_works: ["I, Claudius", "Cadfael", "Hamlet (1996)", "Love Is the Devil"],
  knighthood: "Sir Derek Jacobi (1994)",
  specialization: "Period drama, Shakespeare, classical theater",
  biography: "British actor renowned for classical theatre and historical television roles"
})

// Daniel Craig
CREATE (p_dcraig:HistoricalFigure {
  canonical_id: "daniel_craig_actor",
  name: "Daniel Craig",
  is_fictional: false,
  birth_year: 1968,
  era: "Contemporary (1968-present)",
  profession: "Actor, Film Producer",
  notable_works: ["Love Is the Devil", "Lara Croft", "James Bond series"],
  biography: "British actor famous for James Bond role and diverse dramatic performances"
})

// Tom Hanks
CREATE (p_thanks:HistoricalFigure {
  canonical_id: "tom_hanks_actor",
  name: "Tom Hanks",
  is_fictional: false,
  birth_year: 1956,
  era: "Contemporary (1956-present)",
  profession: "Actor, Film Producer, Director",
  notable_works: ["Forrest Gump", "Saving Private Ryan", "Cast Away", "Apollo 13"],
  biography: "Academy Award-winning American actor with extensive film career"
})

// Sean Penn
CREATE (p_spenn:HistoricalFigure {
  canonical_id: "sean_penn_actor",
  name: "Sean Penn",
  is_fictional: false,
  birth_year: 1960,
  era: "Contemporary (1960-present)",
  profession: "Actor, Film Director, Producer",
  notable_works: ["Mystic River", "Milk", "Dead Man Walking"],
  biography: "Academy Award-winning American actor and director"
})

// Tim Robbins
CREATE (p_trobbins:HistoricalFigure {
  canonical_id: "tim_robbins_actor",
  name: "Tim Robbins",
  is_fictional: false,
  birth_year: 1958,
  era: "Contemporary (1958-present)",
  profession: "Actor, Film Director, Screenwriter",
  notable_works: ["Mystic River", "The Shawshank Redemption", "Cadillac Man"],
  biography: "American actor and director known for dramatic and comedic roles"
})

// Marianne Faithfull
CREATE (p_mfaithfull:HistoricalFigure {
  canonical_id: "marianne_faithfull",
  name: "Marianne Faithfull",
  is_fictional: false,
  birth_year: 1946,
  era: "Contemporary (1946-present)",
  profession: "Singer, Songwriter, Actress, Commentator",
  notable_works: ["As Tears Go By", "Interview with the Vampire", "Francis Bacon: A Brush with Violence"],
  biography: "British-Austrian singer and actress with extensive artistic career"
})

// Kenneth Branagh
CREATE (p_kbranagh:HistoricalFigure {
  canonical_id: "kenneth_branagh_director",
  name: "Kenneth Branagh",
  is_fictional: false,
  birth_year: 1960,
  era: "Contemporary (1960-present)",
  profession: "Actor, Film Director, Producer",
  notable_works: ["Hamlet (1996)", "Henry V", "Murder on the Orient Express"],
  biography: "British-Irish actor-director specializing in Shakespeare adaptations"
})
```

### 2.2 Historical Figures (Subjects)

```cypher
// Francis Bacon - Painter (1909-1992)
CREATE (h_fbaconpainter:HistoricalFigure {
  canonical_id: "francis_bacon_painter",
  name: "Francis Bacon",
  is_fictional: false,
  birth_year: 1909,
  death_year: 1992,
  era: "20th Century (1909-1992)",
  nationality: "British-Irish",
  profession: "Visual Artist, Painter",
  movement: "Abstract Expressionism, Figurative Art",
  biography: "20th-century painter known for violent, distorted human forms and dark subject matter",
  depicted_in_films: ["Love Is the Devil (1998)"],
  subject_of_documentaries: 4,
  art_period: "Modern Art (1920s-1990s)"
})

// Francis Bacon - Philosopher (1561-1626) - NOTED FOR FUTURE RESEARCH
CREATE (h_fbaconphilosopher:HistoricalFigure {
  canonical_id: "francis_bacon_philosopher",
  name: "Francis Bacon",
  is_fictional: false,
  birth_year: 1561,
  death_year: 1626,
  era: "Renaissance (1561-1626)",
  nationality: "English",
  profession: "Philosopher, Statesman, Author",
  contributions: ["Scientific method", "Empiricism", "Novum Organum"],
  biography: "Renaissance philosopher who advanced the scientific method and empirical investigation",
  depicted_in_films: "NONE FOUND - research opportunity",
  era_tag: "Renaissance/Early Modern"
})

// John F. Kennedy (Historical Subject)
CREATE (h_jfk:HistoricalFigure {
  canonical_id: "jfk_historical",
  name: "John F. Kennedy",
  is_fictional: false,
  birth_year: 1917,
  death_year: 1963,
  era: "20th Century (1917-1963)",
  nationality: "American",
  profession: "35th President of United States",
  biography: "American president assassinated in Dallas, Texas in 1963",
  subject_of_film: "JFK (1991)",
  historical_event: "JFK Assassination and Conspiracy Theories"
})

// Emperor Claudius (Roman Historical Figure)
CREATE (h_claudius:HistoricalFigure {
  canonical_id: "claudius_roman_emperor",
  name: "Claudius (Tiberius Claudius Drusus Germanicus)",
  is_fictional: false,
  birth_year: -10,
  death_year: 54,
  era: "Ancient Rome (41-54 CE)",
  nationality: "Roman",
  profession: "Roman Emperor",
  biography: "Fourth Roman Emperor, reign marked by expansion and conquest",
  depicted_in_television: "I, Claudius (1976)",
  depicted_by_actor: "Derek Jacobi"
})

// Astronaut Jack Swigert (Historical Subject)
CREATE (h_swigert:HistoricalFigure {
  canonical_id: "jack_swigert_astronaut",
  name: "Jack Swigert Jr.",
  is_fictional: false,
  birth_year: 1931,
  death_year: 1982,
  era: "20th Century (1931-1982)",
  nationality: "American",
  profession: "NASA Astronaut, Test Pilot",
  biography: "Apollo 13 astronaut who was inserted into mission last-minute; survived crisis",
  depicted_in_film: "Apollo 13 (1995)",
  depicted_by_actor: "Kevin Bacon"
})

// Prince Hamlet (Fictional Character from Shakespeare)
CREATE (h_hamlet:HistoricalFigure {
  canonical_id: "hamlet_fictional",
  name: "Prince Hamlet of Denmark",
  is_fictional: true,
  era: "Medieval Denmark (fictional setting)",
  profession: "Prince, Avenger",
  biography: "Protagonist of Shakespeare's tragedy, Danish prince seeking revenge",
  depicted_in_film: "Hamlet (1996)",
  depicted_by_actor: "Kenneth Branagh",
  source_material: "The Tragedy of Hamlet by William Shakespeare"
})
```

---

## Phase 3: Create Appearance Relationships

```cypher
// Kevin Bacon Appearances
CREATE (p_kbacon)-[:APPEARS_IN {
  role: "Captain Jack Ross",
  character_type: "Military Officer/JAG Judge Advocate",
  sentiment: "Complex",
  year: 1992,
  film_minutes: 119
}]->(m_afew)

CREATE (p_kbacon)-[:APPEARS_IN {
  role: "Jack Swigert",
  character_type: "Astronaut",
  sentiment: "Heroic",
  year: 1995,
  film_minutes: 140,
  historical_figure: "Jack Swigert Jr."
}]->(m_apollo)

CREATE (p_kbacon)-[:APPEARS_IN {
  role: "Willie O'Keefe",
  character_type: "Witness/Informant",
  sentiment: "Complex",
  year: 1991,
  film_minutes: 189
}]->(m_jfk)

CREATE (p_kbacon)-[:APPEARS_IN {
  role: "Sean Devine",
  character_type: "Police Detective",
  sentiment: "Complex",
  year: 2003,
  film_minutes: 138
}]->(m_mystic)

CREATE (p_kbacon)-[:APPEARS_IN {
  role: "[Character Role]",
  character_type: "Actor",
  sentiment: "Unknown",
  year: 2012,
  film_minutes: 108
}]->(m_jayne)

// Jack Lemmon Appearances
CREATE (p_jlemmon)-[:APPEARS_IN {
  role: "Jack Martin",
  character_type: "Witness",
  sentiment: "Complex",
  year: 1991,
  film_minutes: 189
}]->(m_jfk)

CREATE (p_jlemmon)-[:APPEARS_IN {
  role: "Marcellus",
  character_type: "Courtier/Ghost's Friend",
  sentiment: "Supporting",
  year: 1996,
  film_minutes: 242,
  source: "Hamlet by Shakespeare"
}]->(m_hamlet)

// Derek Jacobi Appearances
CREATE (p_djacabi)-[:APPEARS_IN {
  role: "Claudius",
  character_type: "Roman Emperor",
  sentiment: "Villainous",
  year: 1976,
  runtime_minutes: 780,
  accolades: "BAFTA Award for Best Actor"
}]->(m_claudius)

CREATE (p_djacabi)-[:APPEARS_IN {
  role: "Brother Cadfael",
  character_type: "Medieval Monk/Detective",
  sentiment: "Heroic",
  year: 1995,
  runtime_minutes: 3300,
  episodes: 81
}]->(m_cadfael)

CREATE (p_djacabi)-[:APPEARS_IN {
  role: "Claudius",
  character_type: "Danish King",
  sentiment: "Villainous",
  year: 1996,
  film_minutes: 242,
  source: "Hamlet by Shakespeare",
  director: "Kenneth Branagh"
}]->(m_hamlet)

CREATE (p_djacabi)-[:APPEARS_IN {
  role: "Francis Bacon",
  character_type: "20th-century Painter",
  sentiment: "Complex",
  year: 1998,
  film_minutes: 105,
  biographical: true,
  subject_historical_figure: "Francis Bacon (painter, 1909-1992)",
  awards: "Michael Powell Award, British Performance Award"
}]->(m_lovedevil)

// Daniel Craig Appearance
CREATE (p_dcraig)-[:APPEARS_IN {
  role: "George Dyer",
  character_type: "Artist's Lover",
  sentiment: "Complex",
  year: 1998,
  film_minutes: 105,
  awards: "British Performance Award"
}]->(m_lovedevil)

// Tom Hanks Appearance
CREATE (p_thanks)-[:APPEARS_IN {
  role: "Jim Lovell",
  character_type: "Astronaut/Mission Commander",
  sentiment: "Heroic",
  year: 1995,
  film_minutes: 140,
  historical_figure: "Jim Lovell (real astronaut)"
}]->(m_apollo)

// Sean Penn Appearance
CREATE (p_spenn)-[:APPEARS_IN {
  role: "Jimmy Markum",
  character_type: "Childhood Friend/Protagonist",
  sentiment: "Complex",
  year: 2003,
  film_minutes: 138,
  award: "Academy Award for Best Actor"
}]->(m_mystic)

// Tim Robbins Appearance
CREATE (p_trobbins)-[:APPEARS_IN {
  role: "Dave Boyle",
  character_type: "Childhood Friend/Suspect",
  sentiment: "Complex",
  year: 2003,
  film_minutes: 138,
  award: "Academy Award for Best Supporting Actor"
}]->(m_mystic)

// Marianne Faithfull Documentary Appearance
CREATE (p_mfaithfull)-[:APPEARS_IN {
  role: "Herself",
  character_type: "Commentator/Witness",
  sentiment: "Respectful",
  year: 2017,
  runtime_minutes: 80,
  appearance_type: "Documentary Interview"
}]->(m_brushviolence)

// Kenneth Branagh Direction
CREATE (p_kbranagh)-[:DIRECTED {
  year: 1996,
  runtime_minutes: 242,
  notable_aspect: "First complete unabridged theatrical version"
}]->(m_hamlet)

// Francis Bacon as Subject
CREATE (h_fbaconpainter)-[:SUBJECT_OF {
  depicted_by: "Derek Jacobi",
  year: 1998,
  media_type: "Biographical Drama"
}]->(m_lovedevil)

CREATE (h_fbaconpainter)-[:SUBJECT_OF {
  media_type: "Documentary",
  year: 1985,
  film_minutes: 45
}]->(m_brutality)

CREATE (h_fbaconpainter)-[:SUBJECT_OF {
  media_type: "Documentary",
  year: 1988,
  film_minutes: 52
}]->(m_francis88)

CREATE (h_fbaconpainter)-[:SUBJECT_OF {
  media_type: "Documentary",
  year: 2017,
  runtime_minutes: 80
}]->(m_brushviolence)

CREATE (h_fbaconpainter)-[:SUBJECT_OF {
  media_type: "Documentary",
  year: 2022,
  runtime_minutes: 75
}]->(m_outsider)
```

---

## Phase 4: Create Collaboration Relationships

```cypher
// Direct Film Collaborations

// JFK (1991) - Kevin Bacon & Jack Lemmon
CREATE (p_kbacon)-[:COLLABORATED_WITH {
  film: "JFK",
  year: 1991,
  director: "Oliver Stone",
  role_bacon: "Willie O'Keefe",
  role_other: "Jack Martin"
}]->(p_jlemmon)

CREATE (p_jlemmon)-[:COLLABORATED_WITH {
  film: "JFK",
  year: 1991,
  director: "Oliver Stone",
  role_other: "Willie O'Keefe",
  role_lemmon: "Jack Martin"
}]->(p_kbacon)

// Hamlet (1996) - Jack Lemmon & Derek Jacobi
CREATE (p_jlemmon)-[:COLLABORATED_WITH {
  film: "Hamlet",
  year: 1996,
  director: "Kenneth Branagh",
  role_lemmon: "Marcellus",
  role_jacobi: "Claudius"
}]->(p_djacabi)

CREATE (p_djacabi)-[:COLLABORATED_WITH {
  film: "Hamlet",
  year: 1996,
  director: "Kenneth Branagh",
  role_jacobi: "Claudius",
  role_lemmon: "Marcellus"
}]->(p_jlemmon)

// Apollo 13 (1995) - Kevin Bacon & Tom Hanks
CREATE (p_kbacon)-[:COLLABORATED_WITH {
  film: "Apollo 13",
  year: 1995,
  director: "Ron Howard",
  role_bacon: "Jack Swigert",
  role_other: "Jim Lovell"
}]->(p_thanks)

CREATE (p_thanks)-[:COLLABORATED_WITH {
  film: "Apollo 13",
  year: 1995,
  director: "Ron Howard",
  role_other: "Jack Swigert",
  role_hanks: "Jim Lovell"
}]->(p_kbacon)

// Mystic River (2003) - Kevin Bacon, Sean Penn & Tim Robbins
CREATE (p_kbacon)-[:COLLABORATED_WITH {
  film: "Mystic River",
  year: 2003,
  director: "Clint Eastwood",
  role_bacon: "Sean Devine",
  role_other: "Jimmy Markum"
}]->(p_spenn)

CREATE (p_kbacon)-[:COLLABORATED_WITH {
  film: "Mystic River",
  year: 2003,
  director: "Clint Eastwood",
  role_bacon: "Sean Devine",
  role_other: "Dave Boyle"
}]->(p_trobbins)

CREATE (p_spenn)-[:COLLABORATED_WITH {
  film: "Mystic River",
  year: 2003,
  director: "Clint Eastwood",
  role_penn: "Jimmy Markum",
  role_other: "Dave Boyle"
}]->(p_trobbins)

// Love Is the Devil (1998) - Derek Jacobi & Daniel Craig
CREATE (p_djacabi)-[:COLLABORATED_WITH {
  film: "Love Is the Devil",
  year: 1998,
  director: "John Maybury",
  role_jacobi: "Francis Bacon",
  role_other: "George Dyer"
}]->(p_dcraig)

CREATE (p_dcraig)-[:COLLABORATED_WITH {
  film: "Love Is the Devil",
  year: 1998,
  director: "John Maybury",
  role_other: "Francis Bacon",
  role_craig: "George Dyer"
}]->(p_djacabi)
```

---

## Phase 5: Network Path Queries

### Query 1: Find Path Kevin Bacon to Francis Bacon (Painter)

```cypher
MATCH path = shortestPath(
  (start:HistoricalFigure {canonical_id: "kevin_bacon_actor"})
  -[*..10]-(end:HistoricalFigure {canonical_id: "francis_bacon_painter"})
)
WHERE ALL(rel IN relationships(path) WHERE type(rel) IN ['APPEARS_IN', 'COLLABORATED_WITH', 'SUBJECT_OF'])
RETURN path, length(path) as degrees
```

### Query 2: Get All Films Connecting Two Actors

```cypher
MATCH (a1:HistoricalFigure {canonical_id: "kevin_bacon_actor"})
-[rel:COLLABORATED_WITH]->(a2:HistoricalFigure)
RETURN a1.name, rel.film, rel.year, a2.name, rel.role_bacon, rel.role_other
ORDER BY rel.year DESC
```

### Query 3: Find All Media About Historical Figure

```cypher
MATCH (hf:HistoricalFigure {canonical_id: "francis_bacon_painter"})
-[rel:SUBJECT_OF]->(m:MediaWork)
RETURN m.title, m.release_year, rel.media_type, m.runtime_minutes
ORDER BY m.release_year
```

### Query 4: Network Statistics

```cypher
MATCH (a:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
WITH a, COUNT(DISTINCT m) as film_count
WHERE film_count > 1
RETURN a.name, film_count
ORDER BY film_count DESC
```

### Query 5: Period Drama Specialists

```cypher
MATCH (actor:HistoricalFigure)-[rel:APPEARS_IN]->(media:MediaWork)
WHERE media.historical_period IS NOT NULL
  OR media.genre CONTAINS "Historical"
  OR media.genre CONTAINS "Period"
  OR media.genre CONTAINS "Shakespeare"
RETURN actor.name, COUNT(DISTINCT media) as period_drama_count, COLLECT(media.title)
ORDER BY period_drama_count DESC
```

---

## Phase 6: Index Creation for Performance

```cypher
// Create indexes for faster queries
CREATE INDEX ON :HistoricalFigure(canonical_id)
CREATE INDEX ON :MediaWork(wikidata_id)
CREATE INDEX ON :MediaWork(release_year)
CREATE INDEX ON :HistoricalFigure(birth_year)
CREATE CONSTRAINT ON (hf:HistoricalFigure) ASSERT hf.canonical_id IS UNIQUE
CREATE CONSTRAINT ON (mw:MediaWork) ASSERT mw.title IS UNIQUE
```

---

## Phase 7: Validation Checks

### Verify Connection Path

```cypher
// Verify the confirmed 4-degree path exists
MATCH (kb:HistoricalFigure {canonical_id: "kevin_bacon_actor"})
-[r1:COLLABORATED_WITH {film: "JFK"}]->(jl:HistoricalFigure {canonical_id: "jack_lemmon_actor"})
-[r2:COLLABORATED_WITH {film: "Hamlet"}]->(dj:HistoricalFigure {canonical_id: "derek_jacobi_actor"})
-[r3:APPEARS_IN]->(m:MediaWork {title: "Love Is the Devil: Study for a Portrait of Francis Bacon"})
-[r4:SUBJECT_OF]->(fb:HistoricalFigure {canonical_id: "francis_bacon_painter"})
RETURN kb.name, jl.name, dj.name, fb.name,
       r1.film, r2.film, m.title,
       "4 degrees of separation" as result
```

### Check for Orphaned Nodes

```cypher
MATCH (m:MediaWork)
WHERE NOT (m)<--(:HistoricalFigure)
RETURN m.title, m.release_year
```

---

## Phase 8: Future Expansion Opportunities

### 1. Renaissance Philosopher Path

To extend to Francis Bacon (1561-1626), create:
- New `:MediaWork` nodes for Renaissance/Philosophy documentaries
- Connect Derek Jacobi (period drama specialist) to such media
- This would add 1-2 more degrees to the path

### 2. Extended Casting Networks

- Map complete ensemble casts of larger films
- Create `:ENSEMBLE_CAST_OF` relationship types
- Enable "hub" identification (actors appearing in many historical dramas)

### 3. Director Relationships

```cypher
CREATE (director:HistoricalFigure)-[:DIRECTED]->(media:MediaWork)
```

- Kenneth Branagh's Hamlet as a major hub
- Oliver Stone's historical dramas network
- Ron Howard's historical/space films

### 4. Documentary Participants

```cypher
CREATE (participant:HistoricalFigure)-[:APPEARED_IN_DOCUMENTARY {role: "Commentator/Interviewer"}]->(doc:MediaWork)
```

- Track commentators in Francis Bacon documentaries
- Extend network through documentary ecosystem

### 5. Thematic Networks

Add properties for:
- `historical_period`: Ancient Rome, Medieval, Renaissance, etc.
- `film_genre_tags`: ["historical", "biographical", "period-drama", "shakespearian"]
- `thematic_connections`: ["art", "philosophy", "politics", "space exploration"]

---

## Implementation Checklist

- [ ] Phase 1: Create all `:MediaWork` nodes (13 works)
- [ ] Phase 2: Create all `:HistoricalFigure` nodes (12 figures)
- [ ] Phase 3: Create all `:APPEARS_IN` relationships
- [ ] Phase 4: Create all `:COLLABORATED_WITH` relationships
- [ ] Phase 5: Test network path queries
- [ ] Phase 6: Create indexes and constraints
- [ ] Phase 7: Run validation queries
- [ ] Phase 8: Plan expansion phases

---

## Summary

This implementation provides:
- **13 media works** spanning 1976-2022
- **12+ historical figures** including actors and subjects
- **4-degree confirmed path** from Kevin Bacon to Francis Bacon (painter)
- **Framework for expansion** to Renaissance philosopher
- **Query templates** for network analysis
- **Index structure** for Neo4j Aura performance

The network demonstrates how biographical cinema, period drama television, and documentary works create rich connection possibilities for historical figure databases in the ChronosGraph model.

