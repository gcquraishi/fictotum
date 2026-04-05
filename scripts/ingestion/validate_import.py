#!/usr/bin/env python3
"""
Bulk Import Validator

Validates JSON import files against schemas and performs additional business logic checks.

Usage:
  python3 scripts/ingestion/validate_import.py data/examples/ancient-rome.json
  python3 scripts/ingestion/validate_import.py data/examples/ancient-rome.json --strict
"""

import json
import sys
import os
from pathlib import Path
from typing import Dict, List, Any, Tuple
from datetime import datetime

# Try to import jsonschema (graceful degradation if not installed)
try:
    import jsonschema
    from jsonschema import validate, ValidationError, Draft7Validator
    HAS_JSONSCHEMA = True
except ImportError:
    HAS_JSONSCHEMA = False
    print("⚠️  Warning: jsonschema not installed. Schema validation disabled.")
    print("   Install with: pip3 install jsonschema")
    print()

class ImportValidator:
    def __init__(self, strict: bool = False):
        self.strict = strict
        self.errors = []
        self.warnings = []
        self.schema_dir = Path(__file__).parent.parent.parent / "schemas"

    def load_schema(self, schema_name: str) -> Dict:
        """Load JSON schema from schemas/ directory"""
        schema_path = self.schema_dir / schema_name
        if not schema_path.exists():
            raise FileNotFoundError(f"Schema not found: {schema_path}")

        with open(schema_path, 'r') as f:
            return json.load(f)

    def validate_json_schema(self, data: Dict, schema_name: str) -> bool:
        """Validate data against JSON schema"""
        if not HAS_JSONSCHEMA:
            self.warnings.append("JSON schema validation skipped (jsonschema not installed)")
            return True

        try:
            schema = self.load_schema(schema_name)
            validate(instance=data, schema=schema)
            return True
        except ValidationError as e:
            self.errors.append(f"Schema validation failed: {e.message}")
            if e.path:
                path_str = " -> ".join(str(p) for p in e.path)
                self.errors.append(f"  Path: {path_str}")
            return False
        except Exception as e:
            self.errors.append(f"Schema validation error: {str(e)}")
            return False

    def validate_year_range(self, birth: int, death: int, name: str) -> bool:
        """Validate birth_year < death_year"""
        if birth >= death:
            self.errors.append(
                f"Invalid year range for '{name}': "
                f"birth_year ({birth}) must be less than death_year ({death})"
            )
            return False

        # Warn if lifespan seems unreasonable
        lifespan = death - birth
        if lifespan > 120:
            self.warnings.append(
                f"Unusually long lifespan for '{name}': {lifespan} years "
                f"({birth} to {death})"
            )
        elif lifespan < 10:
            self.warnings.append(
                f"Unusually short lifespan for '{name}': {lifespan} years "
                f"({birth} to {death})"
            )

        return True

    def check_duplicates_in_file(self, figures: List[Dict]) -> bool:
        """Check for duplicate figures within import file"""
        seen_names = {}
        seen_wikidata = {}
        has_duplicates = False

        for idx, fig in enumerate(figures):
            name = fig.get('name')
            wikidata_id = fig.get('wikidata_id')

            # Check name duplicates
            if name in seen_names:
                self.errors.append(
                    f"Duplicate figure name '{name}' at index {idx} "
                    f"(first occurrence at index {seen_names[name]})"
                )
                has_duplicates = True
            else:
                seen_names[name] = idx

            # Check Wikidata ID duplicates
            if wikidata_id:
                if wikidata_id in seen_wikidata:
                    self.errors.append(
                        f"Duplicate Wikidata ID '{wikidata_id}' for '{name}' at index {idx} "
                        f"(first occurrence: '{figures[seen_wikidata[wikidata_id]].get('name')}' "
                        f"at index {seen_wikidata[wikidata_id]})"
                    )
                    has_duplicates = True
                else:
                    seen_wikidata[wikidata_id] = idx

        return not has_duplicates

    def validate_figure_portrayals(self, media_works: List[Dict], figures: List[Dict]) -> bool:
        """Validate that portrayed figures exist in the import file"""
        # Build index of figures by possible identifiers
        figure_index = {}
        for fig in figures:
            if 'name' in fig:
                figure_index[fig['name']] = fig
            if 'wikidata_id' in fig:
                figure_index[fig['wikidata_id']] = fig
            if 'canonical_id' in fig:
                figure_index[fig['canonical_id']] = fig

        all_valid = True
        for media_idx, media in enumerate(media_works):
            if 'portrayals' not in media:
                continue

            for portrayal_idx, portrayal in enumerate(media['portrayals']):
                identifier = portrayal.get('figure_identifier')
                if identifier not in figure_index:
                    # This might be okay if figure exists in database
                    self.warnings.append(
                        f"Media '{media.get('title')}' portrayal {portrayal_idx}: "
                        f"figure '{identifier}' not found in import file. "
                        f"Will attempt to link to existing database figure during import."
                    )

        return all_valid

    def validate_figures(self, data: Dict) -> bool:
        """Validate figures array"""
        if 'figures' not in data:
            return True  # No figures to validate

        figures = data['figures']
        all_valid = True

        # Check for duplicates within file
        if not self.check_duplicates_in_file(figures):
            all_valid = False

        # Validate each figure
        for idx, fig in enumerate(figures):
            name = fig.get('name', f'<unnamed-{idx}>')

            # Validate year ranges
            if 'birth_year' in fig and 'death_year' in fig:
                if not self.validate_year_range(
                    fig['birth_year'],
                    fig['death_year'],
                    name
                ):
                    all_valid = False

            # Warn if missing recommended fields
            if not fig.get('wikidata_id'):
                self.warnings.append(
                    f"Figure '{name}' missing wikidata_id (recommended for entity resolution)"
                )

            if not fig.get('era'):
                self.warnings.append(
                    f"Figure '{name}' missing era (recommended for categorization)"
                )

        return all_valid

    def validate_media_works(self, data: Dict) -> bool:
        """Validate media_works array"""
        if 'media_works' not in data:
            return True  # No media to validate

        media_works = data['media_works']
        all_valid = True

        # Check for duplicate titles
        seen_titles = {}
        for idx, media in enumerate(media_works):
            title = media.get('title')
            if title in seen_titles:
                self.warnings.append(
                    f"Duplicate media title '{title}' at index {idx} "
                    f"(first occurrence at index {seen_titles[title]}). "
                    f"This may be intentional for different adaptations."
                )
            else:
                seen_titles[title] = idx

            # Warn if missing recommended fields
            if not media.get('wikidata_id'):
                self.warnings.append(
                    f"Media '{title}' missing wikidata_id (recommended for entity resolution)"
                )

            if not media.get('creator'):
                self.warnings.append(
                    f"Media '{title}' missing creator (recommended)"
                )

            if not media.get('release_year'):
                self.warnings.append(
                    f"Media '{title}' missing release_year (recommended)"
                )

        return all_valid

    def validate_cross_references(self, data: Dict) -> bool:
        """Validate cross-references between figures and media"""
        if 'figures' not in data or 'media_works' not in data:
            return True

        return self.validate_figure_portrayals(
            data['media_works'],
            data['figures']
        )

    def validate_file(self, file_path: str) -> Tuple[bool, List[str], List[str]]:
        """
        Validate an import file

        Returns:
          (is_valid, errors, warnings)
        """
        self.errors = []
        self.warnings = []

        # Load JSON file
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            self.errors.append(f"Invalid JSON: {e}")
            return False, self.errors, self.warnings
        except FileNotFoundError:
            self.errors.append(f"File not found: {file_path}")
            return False, self.errors, self.warnings

        # Detect import type and validate schema
        has_figures = 'figures' in data
        has_media = 'media_works' in data

        if not has_figures and not has_media:
            self.errors.append(
                "Invalid import file: must contain 'figures' or 'media_works' array"
            )
            return False, self.errors, self.warnings

        all_valid = True

        # Choose appropriate schema
        if has_figures and has_media:
            # Combined import - use combined schema
            if not self.validate_json_schema(data, 'bulk-import-combined.json'):
                all_valid = False
        elif has_figures:
            # Figures only
            if not self.validate_json_schema(data, 'bulk-import-figure.json'):
                all_valid = False
        elif has_media:
            # Media only
            if not self.validate_json_schema(data, 'bulk-import-media.json'):
                all_valid = False

        # Validate business logic
        if has_figures:
            if not self.validate_figures(data):
                all_valid = False

        if has_media:
            if not self.validate_media_works(data):
                all_valid = False

        # Validate cross-references
        if has_figures and has_media:
            if not self.validate_cross_references(data):
                all_valid = False

        # In strict mode, warnings become errors
        if self.strict and self.warnings:
            self.errors.extend([f"[STRICT] {w}" for w in self.warnings])
            self.warnings = []
            all_valid = False

        return all_valid, self.errors, self.warnings

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/ingestion/validate_import.py <file.json> [--strict]")
        sys.exit(1)

    file_path = sys.argv[1]
    strict = '--strict' in sys.argv

    validator = ImportValidator(strict=strict)

    print("=" * 80)
    print(f"VALIDATING IMPORT FILE: {file_path}")
    print("=" * 80)
    print()

    is_valid, errors, warnings = validator.validate_file(file_path)

    # Print results
    if errors:
        print(f"❌ VALIDATION ERRORS ({len(errors)}):")
        print("-" * 80)
        for error in errors:
            print(f"  • {error}")
        print()

    if warnings:
        print(f"⚠️  WARNINGS ({len(warnings)}):")
        print("-" * 80)
        for warning in warnings:
            print(f"  • {warning}")
        print()

    if is_valid:
        print("✅ VALIDATION PASSED")
        if warnings:
            print(f"   ({len(warnings)} warnings - review recommended)")
        print()
        sys.exit(0)
    else:
        print("❌ VALIDATION FAILED")
        print(f"   {len(errors)} error(s), {len(warnings)} warning(s)")
        print()
        sys.exit(1)

if __name__ == '__main__':
    main()
