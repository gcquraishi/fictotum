# Strategic Decisions Log
- **2026-01-14:** Chose Neo4j AuraDB Free tier. Limits: 200k nodes.
- **2026-01-14:** Established `:HistoricalFigure` and `:MediaWork` schema.
- **2026-01-15:** Pivoted to Sonnet 4.5 for ingestion to maximize token longevity (5x cheaper than Opus).
- **2026-01-15:** Integrated Neo4j MCP for direct database visibility.
- **2026-01-15:** Adopted Wikidata Q-IDs as canonical identifiers for `:MediaWork` entity resolution.
- **2026-01-15:** Initialized Unified Ingestion Framework to consolidate era-specific scripts into a modular, JSON-driven system.
- **2026-01-15:** Retroactively applied is_fictional: true flag to existing narrative anchors (vorenus, pullo, bayek, gordianus) to distinguish dramatic inventions from historical figures.