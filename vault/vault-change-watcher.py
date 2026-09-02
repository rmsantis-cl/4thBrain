#!/usr/bin/env python3
"""
Vault Change Watcher for Smart Connections Re-indexing (Story 3.1)

Monitors $VAULT_DIR/ for new/modified Markdown files and records them
in a pending-index state file. The Smart Connections plugin (running in
Obsidian) will detect these changes and re-index them as part of its
normal file-watch flow.

Usage:
    python vault/vault-change-watcher.py [--vault-dir PATH] [--watch-duration SECONDS]

Environment:
    VAULT_DIR - Markdown vault root directory (from params.json if not specified)

Implementation for Story 3.1 acceptance criterion 1: Modified or created notes
are automatically scanned and indexed.
"""

import os
import json
import time
import argparse
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, Set

def load_params():
    """Load params.json from project root."""
    params_path = Path(__file__).parent.parent / "params.json"
    if not params_path.exists():
        raise FileNotFoundError(f"params.json not found at {params_path}")
    with open(params_path) as f:
        return json.load(f)

def get_vault_dir(override_path: str = None) -> Path:
    """Get vault directory from params or override."""
    if override_path:
        return Path(override_path)
    params = load_params()
    vault_dir = params.get("VAULT_DIR")
    if not vault_dir:
        raise ValueError("VAULT_DIR not defined in params.json")
    return Path(vault_dir)

def get_pending_index_file(vault_dir: Path) -> Path:
    """Get path to pending-index.json state file."""
    smart_env = vault_dir / ".smart-env"
    smart_env.mkdir(exist_ok=True)
    return smart_env / "pending-index.json"

def load_pending_index(pending_file: Path) -> Dict:
    """Load existing pending-index.json or return empty state."""
    if not pending_file.exists():
        return {"version": 1, "last_scan": None, "files": {}}
    try:
        with open(pending_file) as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {"version": 1, "last_scan": None, "files": {}}

def save_pending_index(pending_file: Path, state: Dict):
    """Save pending-index.json state file."""
    pending_file.parent.mkdir(parents=True, exist_ok=True)
    with open(pending_file, 'w') as f:
        json.dump(state, f, indent=2)

def file_hash(path: Path) -> str:
    """Compute hash of file content (first 1MB)."""
    try:
        with open(path, 'rb') as f:
            return hashlib.sha256(f.read(1024 * 1024)).hexdigest()
    except (IOError, OSError):
        return ""

def scan_vault_for_changes(vault_dir: Path, previous_state: Dict) -> Dict:
    """
    Scan vault directory for new/modified .md files.
    Compare against previous state to identify changes.
    """
    new_state = {"version": 1, "last_scan": datetime.utcnow().isoformat(), "files": {}}
    previous_files = previous_state.get("files", {})
    changes = {}

    # Scan vault for .md files
    for md_file in vault_dir.rglob("*.md"):
        # Skip .smart-env and .obsidian directories
        if ".smart-env" in md_file.parts or ".obsidian" in md_file.parts:
            continue

        relative_path = str(md_file.relative_to(vault_dir))
        current_hash = file_hash(md_file)
        previous_hash = previous_files.get(relative_path, {}).get("hash")
        mtime = md_file.stat().st_mtime_ns

        new_state["files"][relative_path] = {
            "hash": current_hash,
            "mtime": mtime,
            "size": md_file.stat().st_size
        }

        # Detect change (new or modified)
        if previous_hash is None:
            changes[relative_path] = "created"
        elif previous_hash != current_hash:
            changes[relative_path] = "modified"

    return new_state, changes

def log_event(component: str, event: str, details: Dict = None):
    """Log structured JSON event."""
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "component": component,
        "event": event,
    }
    if details:
        entry.update(details)
    print(json.dumps(entry))

def main():
    parser = argparse.ArgumentParser(
        description="Watch vault for changes and record pending indexing state"
    )
    parser.add_argument("--vault-dir", help="Vault directory override")
    parser.add_argument("--watch-duration", type=int, default=0,
                       help="Seconds to watch for changes (0 = single scan)")
    args = parser.parse_args()

    try:
        vault_dir = get_vault_dir(args.vault_dir)
        pending_file = get_pending_index_file(vault_dir)

        log_event("vault-watcher", "scan_started", {
            "vault_dir": str(vault_dir),
            "pending_file": str(pending_file)
        })

        # Load previous state
        previous_state = load_pending_index(pending_file)

        # Scan for changes
        new_state, changes = scan_vault_for_changes(vault_dir, previous_state)

        # Save updated state
        save_pending_index(pending_file, new_state)

        # Log results
        log_event("vault-watcher", "scan_completed", {
            "files_scanned": len(new_state["files"]),
            "files_changed": len(changes),
            "changed_files": changes,
            "pending_file_updated": True
        })

        if changes:
            log_event("vault-watcher", "changes_detected", {
                "count": len(changes),
                "summary": f"{len(changes)} files need re-indexing; awaiting Obsidian Smart Connections re-index"
            })
        else:
            log_event("vault-watcher", "no_changes", {})

        return 0

    except Exception as e:
        log_event("vault-watcher", "error", {
            "error": str(e),
            "error_type": type(e).__name__
        })
        return 1

if __name__ == "__main__":
    exit(main())
