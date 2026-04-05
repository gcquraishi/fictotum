#!/usr/bin/env python3
"""
API Response Time Profiler

Profiles critical API endpoints to identify performance bottlenecks.
Measures cold and warm cache performance.

Usage:
  python3 scripts/qa/api_profiler.py
"""

import time
import statistics
import requests
import json
from typing import List, Dict, Any

# Base URL for the Next.js app (running on localhost:3000)
BASE_URL = "http://localhost:3000"

class APIProfiler:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.results = []

    def profile_endpoint(
        self,
        name: str,
        path: str,
        runs: int = 3,
        description: str = ""
    ) -> Dict[str, Any]:
        """Profile a single endpoint with multiple runs"""
        print(f"\n{'=' * 80}")
        print(f"Profiling: {name}")
        print(f"Endpoint: {path}")
        if description:
            print(f"Description: {description}")
        print(f"Runs: {runs}")
        print('-' * 80)

        times = []
        errors = []

        for i in range(runs):
            try:
                url = f"{self.base_url}{path}"
                start = time.time()
                response = requests.get(url, timeout=30)
                elapsed = (time.time() - start) * 1000  # Convert to ms

                if response.status_code == 200:
                    times.append(elapsed)
                    cache_status = "HIT" if i > 0 and elapsed < times[0] * 0.5 else "MISS"
                    print(f"  Run {i+1}: {elapsed:.2f}ms (Status: {response.status_code}) [{cache_status}]")
                else:
                    error_msg = f"HTTP {response.status_code}"
                    errors.append(error_msg)
                    print(f"  Run {i+1}: ERROR - {error_msg}")

            except Exception as e:
                error_msg = str(e)
                errors.append(error_msg)
                print(f"  Run {i+1}: ERROR - {error_msg}")

        if times:
            avg_time = statistics.mean(times)
            min_time = min(times)
            max_time = max(times)

            # Calculate cache speedup (first run vs subsequent runs)
            cache_speedup = None
            if len(times) > 1:
                cold_time = times[0]
                warm_times = times[1:]
                avg_warm = statistics.mean(warm_times)
                cache_speedup = cold_time / avg_warm if avg_warm > 0 else 1.0

            result = {
                'name': name,
                'path': path,
                'description': description,
                'runs': len(times),
                'avg_ms': avg_time,
                'min_ms': min_time,
                'max_ms': max_time,
                'cold_ms': times[0] if times else None,
                'warm_avg_ms': statistics.mean(times[1:]) if len(times) > 1 else None,
                'cache_speedup': cache_speedup,
                'errors': errors,
                'status': 'success' if not errors else 'partial' if times else 'failed'
            }

            print(f"\nResults:")
            print(f"  Average: {avg_time:.2f}ms")
            print(f"  Min: {min_time:.2f}ms")
            print(f"  Max: {max_time:.2f}ms")
            if cache_speedup:
                print(f"  Cache Speedup: {cache_speedup:.1f}x (cold: {times[0]:.2f}ms → warm: {result['warm_avg_ms']:.2f}ms)")

        else:
            result = {
                'name': name,
                'path': path,
                'description': description,
                'runs': 0,
                'avg_ms': None,
                'min_ms': None,
                'max_ms': None,
                'cold_ms': None,
                'warm_avg_ms': None,
                'cache_speedup': None,
                'errors': errors,
                'status': 'failed'
            }
            print(f"\n❌ All runs failed")

        if errors:
            print(f"\nErrors: {len(errors)}/{runs}")
            for error in set(errors):
                print(f"  - {error}")

        self.results.append(result)
        return result

    def run_suite(self):
        """Run the full profiling suite"""
        print("=" * 80)
        print("Fictotum API Performance Profiler")
        print("=" * 80)
        print(f"Base URL: {self.base_url}")
        print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print()

        # 1. Figure Search
        self.profile_endpoint(
            "Figure Search",
            "/api/figures/search?q=Caesar",
            runs=3,
            description="Search for historical figures by name"
        )

        # 2. Universal Search
        self.profile_endpoint(
            "Universal Search",
            "/api/search/universal?q=Napoleon",
            runs=3,
            description="Cross-category search (figures, media, locations, etc.)"
        )

        # 3. Duplicate Detection (expensive operation)
        self.profile_endpoint(
            "Duplicate Detection",
            "/api/audit/duplicates?threshold=0.7&limit=50",
            runs=2,  # Only 2 runs since this is expensive
            description="Detect potential duplicate HistoricalFigure nodes"
        )

        # 4. Figure Details
        self.profile_endpoint(
            "Figure Details",
            "/api/figures/Q1048",  # Julius Caesar
            runs=3,
            description="Fetch single figure with relationships"
        )

        # 5. Media Work Details
        self.profile_endpoint(
            "Media Work Details",
            "/api/media/Q174583",  # Gladiator (2000)
            runs=3,
            description="Fetch single media work with cast/portrayals"
        )

        # 6. Cache Stats
        self.profile_endpoint(
            "Cache Statistics",
            "/api/admin/cache/stats",
            runs=3,
            description="Retrieve cache performance metrics"
        )

        # Generate summary
        self.print_summary()

    def print_summary(self):
        """Print performance summary"""
        print("\n" + "=" * 80)
        print("PERFORMANCE SUMMARY")
        print("=" * 80)

        successful = [r for r in self.results if r['status'] == 'success']
        partial = [r for r in self.results if r['status'] == 'partial']
        failed = [r for r in self.results if r['status'] == 'failed']

        print(f"\nEndpoints Tested: {len(self.results)}")
        print(f"  ✅ Success: {len(successful)}")
        print(f"  ⚠️  Partial: {len(partial)}")
        print(f"  ❌ Failed: {len(failed)}")

        if successful:
            print("\n" + "-" * 80)
            print("Response Times (Average)")
            print("-" * 80)

            # Sort by average response time
            sorted_results = sorted(successful, key=lambda x: x['avg_ms'])

            for r in sorted_results:
                emoji = "🚀" if r['avg_ms'] < 100 else "✅" if r['avg_ms'] < 500 else "⚠️"
                cache_info = f" | Cache: {r['cache_speedup']:.1f}x speedup" if r['cache_speedup'] else ""
                print(f"  {emoji} {r['name']}: {r['avg_ms']:.2f}ms{cache_info}")

            # Performance tiers
            print("\n" + "-" * 80)
            print("Performance Tiers")
            print("-" * 80)

            fast = [r for r in successful if r['avg_ms'] < 100]
            good = [r for r in successful if 100 <= r['avg_ms'] < 500]
            slow = [r for r in successful if r['avg_ms'] >= 500]

            print(f"  🚀 Fast (<100ms): {len(fast)}")
            for r in fast:
                print(f"     - {r['name']}: {r['avg_ms']:.2f}ms")

            print(f"  ✅ Good (100-500ms): {len(good)}")
            for r in good:
                print(f"     - {r['name']}: {r['avg_ms']:.2f}ms")

            print(f"  ⚠️  Slow (≥500ms): {len(slow)}")
            for r in slow:
                print(f"     - {r['name']}: {r['avg_ms']:.2f}ms")

            # Cache effectiveness
            print("\n" + "-" * 80)
            print("Cache Effectiveness")
            print("-" * 80)

            cached_endpoints = [r for r in successful if r['cache_speedup']]
            if cached_endpoints:
                avg_speedup = statistics.mean([r['cache_speedup'] for r in cached_endpoints])
                print(f"  Average Cache Speedup: {avg_speedup:.1f}x")
                print(f"  Endpoints with Caching: {len(cached_endpoints)}/{len(successful)}")

                for r in sorted(cached_endpoints, key=lambda x: x['cache_speedup'], reverse=True):
                    cold = r['cold_ms']
                    warm = r['warm_avg_ms']
                    speedup = r['cache_speedup']
                    print(f"    {r['name']}: {speedup:.1f}x ({cold:.2f}ms → {warm:.2f}ms)")
            else:
                print("  No cache speedup detected (all endpoints may be failing or not cached)")

        if failed:
            print("\n" + "-" * 80)
            print("❌ Failed Endpoints")
            print("-" * 80)
            for r in failed:
                print(f"  - {r['name']}: {r['path']}")
                for error in set(r['errors']):
                    print(f"    Error: {error}")

        print("\n" + "=" * 80)
        print("✅ PROFILING COMPLETE")
        print("=" * 80)

def main():
    profiler = APIProfiler()

    print("\n⚠️  NOTE: This script requires the Next.js dev server to be running.")
    print("Please start the server with: cd web-app && npm run dev")
    print("\nPress Enter to continue or Ctrl+C to cancel...")
    try:
        input()
    except KeyboardInterrupt:
        print("\n\nCancelled by user.")
        return

    profiler.run_suite()

if __name__ == '__main__':
    main()
