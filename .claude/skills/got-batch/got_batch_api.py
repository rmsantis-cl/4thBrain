#!/usr/bin/env python3
"""Query Anthropic Batch API and update BATCH_TRACKER.md"""

import sys
import os
import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import urllib.request
import urllib.error

def load_env():
    """Load ANTHROPIC_API_KEY from ~/.env"""
    env_path = Path.home() / ".env"
    if not env_path.exists():
        print(f"Error: {env_path} not found", file=sys.stderr)
        sys.exit(1)

    api_key = None
    with open(env_path, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            line = line.strip()
            if line.startswith("ANTHROPIC_API_KEY="):
                api_key = line.split("=", 1)[1].strip('"\'')
                break

    if not api_key:
        print("Error: ANTHROPIC_API_KEY not found in ~/.env", file=sys.stderr)
        sys.exit(1)

    return api_key

def get_est_timestamp() -> str:
    """Get current time in EST/EDT with proper offset"""
    now_utc = datetime.utcnow()
    year = now_utc.year

    # Second Sunday of March
    march_1 = datetime(year, 3, 1)
    dst_start = march_1 + timedelta(days=(6 - march_1.weekday() + 7) % 7 + 7)

    # First Sunday of November
    nov_1 = datetime(year, 11, 1)
    dst_end = nov_1 + timedelta(days=(6 - nov_1.weekday()) % 7)

    if dst_start <= now_utc < dst_end:
        offset = "-04:00"  # EDT
        hours_offset = 4
    else:
        offset = "-05:00"  # EST
        hours_offset = 5

    est_time = now_utc - timedelta(hours=hours_offset)
    return est_time.strftime("%Y-%m-%dT%H:%M:%S") + offset

def find_batch_id_in_tracker(friendly_id: str, tracker_path: str = "documets/BATCH_TRACKER.md") -> Optional[str]:
    """Find the real batch ID (msgbatch_*) from BATCH_TRACKER.md"""
    if not os.path.exists(tracker_path):
        print(f"Error: {tracker_path} not found", file=sys.stderr)
        sys.exit(1)

    with open(tracker_path, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            if re.match(rf"^\|\s*{re.escape(friendly_id)}\s*\|", line):
                match = re.search(r"<!-- (?:API ID: )?(msgbatch_[a-zA-Z0-9]+) -->", line)
                if match:
                    return match.group(1)

    print(f"Error: Friendly ID '{friendly_id}' not found in {tracker_path}", file=sys.stderr)
    sys.exit(1)

def query_batch_api(batch_id: str, api_key: str) -> dict:
    """Query Anthropic Batch API for batch status"""
    url = f"https://api.anthropic.com/v1/messages/batches/{batch_id}"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "anthropic-version": "2023-06-01"
    }

    req = urllib.request.Request(url, headers=headers, method="GET")

    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"Error: HTTP {e.code} - {error_body}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: Failed to query Batch API: {e}", file=sys.stderr)
        sys.exit(1)

def update_tracker(friendly_id: str, display_status: str, tracker_path: str = "documets/BATCH_TRACKER.md"):
    """Update BATCH_TRACKER.md with latest status"""
    if not os.path.exists(tracker_path):
        print(f"Error: {tracker_path} not found", file=sys.stderr)
        sys.exit(1)

    with open(tracker_path, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()

    now_timestamp = get_est_timestamp()
    updated = False

    for i, line in enumerate(lines):
        if re.match(rf"^\|\s*{re.escape(friendly_id)}\s*\|", line):
            parts = [p.strip() for p in line.split("|")]
            if len(parts) >= 8:
                description = parts[2]
                submitted = parts[3]
                completed = parts[4]
                api_id_match = re.search(r"<!-- (?:API ID: )?(msgbatch_[a-zA-Z0-9]+) -->", line)
                api_id_comment = f"<!-- {api_id_match.group(0)[5:-4]} -->" if api_id_match else ""

                if display_status == "finish":
                    completed = now_timestamp

                lines[i] = f"| {friendly_id} | {description} | {submitted} | {completed} | {display_status} | {now_timestamp} | {api_id_comment}\n"
                updated = True
                break

    if updated:
        with open(tracker_path, 'w', encoding='utf-8', errors='replace') as f:
            f.writelines(lines)
        return True
    return False

def retrieve_results(batch_id: str, api_key: str, friendly_id: str) -> Optional[str]:
    """Retrieve batch results from API"""
    url = f"https://api.anthropic.com/v1/messages/batches/{batch_id}/results"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "anthropic-version": "2023-06-01"
    }

    req = urllib.request.Request(url, headers=headers, method="GET")

    try:
        with urllib.request.urlopen(req) as response:
            results = response.read().decode('utf-8', errors='replace')
            filename_safe_id = re.sub(r'[^a-zA-Z0-9_-]', '_', friendly_id)
            results_path = f"batch-results-{filename_safe_id}.jsonl"

            with open(results_path, 'w', encoding='utf-8', errors='replace') as f:
                f.write(results)

            return results_path
    except Exception as e:
        print(f"Error: Failed to retrieve results: {e}", file=sys.stderr)
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python got_batch_api.py <friendly_id> [--retrieve]", file=sys.stderr)
        sys.exit(1)

    friendly_id = sys.argv[1]
    retrieve = "--retrieve" in sys.argv

    api_key = load_env()
    real_batch_id = find_batch_id_in_tracker(friendly_id)

    print(f"Checking batch status for '{friendly_id}'...", file=sys.stderr)
    response = query_batch_api(real_batch_id, api_key)

    status = response.get("processing_status", "unknown")
    request_counts = response.get("request_counts", {})

    if status == "ended":
        display_status = "finish"
    elif status in ("queued", "processing"):
        display_status = "active"
    else:
        display_status = status

    print(f"Status: {display_status}")
    if request_counts.get("processing", 0) > 0 or request_counts.get("queued", 0) > 0:
        print(f"Progress: Completed: {request_counts.get('succeeded', 0)}, Failed: {request_counts.get('failed', 0)}, Processing: {request_counts.get('processing', 0)}, Queued: {request_counts.get('queued', 0)}")

    if response.get("created_at"):
        print(f"Created: {response.get('created_at')}")

    if response.get("expires_at") and display_status == "active":
        print(f"Expires: {response.get('expires_at')}")

    if update_tracker(friendly_id, display_status):
        print("✓ BATCH_TRACKER.md updated")
    else:
        print("Warning: Batch ID not found in BATCH_TRACKER.md", file=sys.stderr)

    if retrieve:
        if display_status == "finish":
            print("Retrieving batch results...")
            results_path = retrieve_results(real_batch_id, api_key, friendly_id)
            if results_path:
                print(f"Results saved to: {results_path}")
            sys.exit(0 if results_path else 1)
        else:
            print(f"Job not yet complete (status: {display_status}). Check back later.")
            print(f"Rerun with --retrieve flag once job is finished: /got-batch '{friendly_id}' --retrieve")
    else:
        print(f"\nTo retrieve results when complete, run: /got-batch '{friendly_id}' --retrieve")

if __name__ == "__main__":
    main()
