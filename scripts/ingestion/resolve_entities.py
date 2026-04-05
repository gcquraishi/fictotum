#!/usr/bin/env python3
"""
Entity Resolution Utility

Manages entity resolution decisions for bulk imports.
Provides utilities to save, load, and apply resolution decisions.

Usage:
  python3 scripts/ingestion/resolve_entities.py --list
  python3 scripts/ingestion/resolve_entities.py --clear
  python3 scripts/ingestion/resolve_entities.py --export resolutions.json
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any

CACHE_DIR = Path('data/.ingestion-cache')
RESOLUTIONS_FILE = CACHE_DIR / 'resolutions.json'

class ResolutionManager:
    def __init__(self):
        self.resolutions: Dict[str, str] = {}
        self.load()

    def load(self):
        """Load resolutions from cache file"""
        if RESOLUTIONS_FILE.exists():
            with open(RESOLUTIONS_FILE, 'r') as f:
                self.resolutions = json.load(f)

    def save(self):
        """Save resolutions to cache file"""
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with open(RESOLUTIONS_FILE, 'w') as f:
            json.dump(self.resolutions, f, indent=2, sort_keys=True)

    def add(self, import_id: str, existing_id: str, action: str):
        """Add a resolution decision"""
        key = f"{import_id}|{existing_id}"
        self.resolutions[key] = action
        self.save()

    def get(self, import_id: str, existing_id: str) -> str | None:
        """Get resolution for a specific pair"""
        key = f"{import_id}|{existing_id}"
        return self.resolutions.get(key)

    def clear(self):
        """Clear all resolutions"""
        self.resolutions = {}
        if RESOLUTIONS_FILE.exists():
            RESOLUTIONS_FILE.unlink()

    def list_resolutions(self):
        """Print all resolutions"""
        if not self.resolutions:
            print("No resolutions saved.")
            return

        print(f"Saved Resolutions ({len(self.resolutions)}):")
        print("=" * 80)

        # Group by action
        by_action = {'use_existing': [], 'create_new': [], 'skip': []}
        for key, action in self.resolutions.items():
            by_action[action].append(key)

        for action, keys in by_action.items():
            if keys:
                print(f"\n{action.upper()} ({len(keys)}):")
                for key in sorted(keys):
                    import_id, existing_id = key.split('|')
                    print(f"  • {import_id} → {existing_id}")

    def export(self, output_path: str):
        """Export resolutions to JSON file"""
        with open(output_path, 'w') as f:
            json.dump(self.resolutions, f, indent=2, sort_keys=True)
        print(f"✅ Exported {len(self.resolutions)} resolutions to {output_path}")

    def import_resolutions(self, input_path: str):
        """Import resolutions from JSON file"""
        with open(input_path, 'r') as f:
            imported = json.load(f)

        self.resolutions.update(imported)
        self.save()
        print(f"✅ Imported {len(imported)} resolutions from {input_path}")

def main():
    manager = ResolutionManager()

    if '--list' in sys.argv:
        manager.list_resolutions()

    elif '--clear' in sys.argv:
        confirm = input("Clear all saved resolutions? [y/N] ").strip().lower()
        if confirm == 'y':
            manager.clear()
            print("✅ All resolutions cleared")
        else:
            print("Cancelled")

    elif '--export' in sys.argv:
        idx = sys.argv.index('--export')
        if idx + 1 < len(sys.argv):
            output_path = sys.argv[idx + 1]
            manager.export(output_path)
        else:
            print("Error: --export requires output file path")
            sys.exit(1)

    elif '--import' in sys.argv:
        idx = sys.argv.index('--import')
        if idx + 1 < len(sys.argv):
            input_path = sys.argv[idx + 1]
            manager.import_resolutions(input_path)
        else:
            print("Error: --import requires input file path")
            sys.exit(1)

    else:
        print("Entity Resolution Manager")
        print()
        print("Usage:")
        print("  python3 scripts/ingestion/resolve_entities.py --list")
        print("  python3 scripts/ingestion/resolve_entities.py --clear")
        print("  python3 scripts/ingestion/resolve_entities.py --export <file.json>")
        print("  python3 scripts/ingestion/resolve_entities.py --import <file.json>")
        print()
        print(f"Cache location: {RESOLUTIONS_FILE}")
        print(f"Current resolutions: {len(manager.resolutions)}")

if __name__ == '__main__':
    main()
