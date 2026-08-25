"""Report Smart Connections indexing status by reading .smart-env directly.

Spike 3.2 deliverable. Terminology matches Smart Connections' own in-app
"Smart Environment" health panel (Obsidian, Smart Connections plugin settings):

    current   - embedded and up to date (this script's "indexed")
    missing   - eligible but not yet embedded (this script's "pending")
    skipped   - ineligible under the current embedding policy, e.g. below
                min_chars or matching a file/folder exclusion. Per user
                direction, this project counts "skipped" as "failed to index".
    unexpected - a vector exists for an item that is no longer eligible
                (e.g. content shrank below min_chars after being embedded)

Reasons for "skipped"/"unexpected" are inferred from smart_env.json's
thresholds (min_chars, file_exclusions, folder_exclusions) since Smart
Connections does not persist a reason string in smart_sources.ajson itself —
the in-app panel computes it live the same way, by comparing stored size
against current settings.
"""

import json
import sys
from pathlib import Path

PARAMS_FILE = Path(__file__).parent.parent / "params.json"


def load_params() -> dict:
    with open(PARAMS_FILE, encoding="utf-8") as f:
        return json.load(f)


def parse_ajson(path: Path) -> dict:
    """*.ajson is a sequence of `"key": {...},` lines, not a single JSON document."""
    entries = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            if line.endswith(","):
                line = line[:-1]
            key, _, rest = line.partition(": ")
            key = json.loads(key)
            try:
                value = json.loads(rest)
            except json.JSONDecodeError:
                continue
            entries[key] = value
    return entries


def load_env_settings(params: dict) -> dict:
    env_path = Path(params["vault_dir"]) / params["smart_env_dir"] / "smart_env.json"
    with open(env_path, encoding="utf-8") as f:
        return json.load(f)


def load_sources(params: dict) -> dict:
    smart_sources_dir = Path(params["vault_dir"]) / params["smart_env_dir"] / "smart_sources"
    ajson_path = smart_sources_dir / "smart_sources.ajson"
    entries = parse_ajson(ajson_path)
    # keys look like "smart_sources:relative/path.md"; a null value is a tombstone for a deleted source
    return {
        k.split(":", 1)[1]: v
        for k, v in entries.items()
        if k.startswith("smart_sources:") and v is not None
    }


def is_embedded(embedding: dict) -> bool:
    default = (embedding or {}).get("default") or {}
    return any(model.get("at") for model in default.values())


def skip_reason(size: int, min_chars: int, path: str, file_exclusions: str, folder_exclusions: str) -> str:
    if size is not None and size < min_chars:
        return f"Below minimum size ({size} chars, minimum is {min_chars})"
    for pattern in filter(None, (p.strip() for p in file_exclusions.split(","))):
        if pattern.lower() in path.lower():
            return f"Matches file exclusion pattern '{pattern}'"
    for pattern in filter(None, (p.strip() for p in folder_exclusions.split(","))):
        if pattern.lower() in path.lower():
            return f"Matches folder exclusion pattern '{pattern}'"
    return "Excluded under current embedding policy (reason not decodable from stored data)"


def classify_source(entry: dict, env: dict) -> tuple:
    """Returns (status, reason_or_None) for a single source."""
    min_chars = env["smart_sources"]["min_chars"]
    file_exclusions = env["smart_sources"].get("file_exclusions", "")
    folder_exclusions = env["smart_sources"].get("folder_exclusions", "")
    size = entry.get("last_import", {}).get("size")
    path = entry.get("path", "")
    eligible = size is None or size >= min_chars

    embedded = is_embedded(entry.get("embedding", {}))
    if embedded and eligible:
        return "current", None
    if embedded and not eligible:
        return "unexpected", skip_reason(size, min_chars, path, file_exclusions, folder_exclusions)
    if not eligible:
        return "skipped", skip_reason(size, min_chars, path, file_exclusions, folder_exclusions)
    return "missing", None


def classify_blocks(entry: dict, env: dict) -> list:
    """Returns a list of (block_key, status, reason_or_None) for every block in a source."""
    min_chars = env["smart_blocks"]["min_chars"]
    file_exclusions = ""  # block exclusions are heading-based, not file/folder
    folder_exclusions = ""
    results = []
    for key, block in entry.get("blocks_data", {}).items():
        size = block.get("size")
        should_embed = block.get("should_embed", True)
        embedded = is_embedded(block.get("embedding", {}))
        if embedded and should_embed:
            results.append((key, "current", None))
        elif embedded and not should_embed:
            results.append((key, "unexpected", skip_reason(size, min_chars, key, file_exclusions, folder_exclusions)))
        elif not should_embed:
            results.append((key, "skipped", skip_reason(size, min_chars, key, file_exclusions, folder_exclusions)))
        else:
            results.append((key, "missing", None))
    return results


def summarize(sources: dict, env: dict) -> None:
    source_counts = {"current": 0, "missing": 0, "skipped": 0, "unexpected": 0}
    block_counts = {"current": 0, "missing": 0, "skipped": 0, "unexpected": 0}
    skipped_sources = []

    for path, entry in sources.items():
        status, reason = classify_source(entry, env)
        source_counts[status] += 1
        if status in ("skipped", "unexpected"):
            skipped_sources.append((path, status, reason))

        for _, block_status, _ in classify_blocks(entry, env):
            block_counts[block_status] += 1

    print("Smart Sources")
    print(f"  total:    {len(sources)}")
    print(f"  current (indexed):    {source_counts['current']}")
    print(f"  missing (pending):    {source_counts['missing']}")
    print(f"  skipped (failed):     {source_counts['skipped']}")
    print(f"  unexpected:           {source_counts['unexpected']}")

    print("\nSmart Blocks")
    total_blocks = sum(block_counts.values())
    print(f"  total:    {total_blocks}")
    print(f"  current (indexed):    {block_counts['current']}")
    print(f"  missing (pending):    {block_counts['missing']}")
    print(f"  skipped (failed):     {block_counts['skipped']}")
    print(f"  unexpected:           {block_counts['unexpected']}")

    if skipped_sources:
        print("\nSkipped / unexpected sources (treated as failed to index):")
        for path, status, reason in skipped_sources:
            print(f"  - [{status}] {path}: {reason}")


def lookup(sources: dict, env: dict, note_path: str) -> None:
    entry = sources.get(note_path)
    if entry is None:
        print(f"'{note_path}' not found in smart_sources — never scanned (check the path is vault-relative).")
        return
    status, reason = classify_source(entry, env)
    print(f"'{note_path}': {status}" + (f" — {reason}" if reason else ""))
    if status == "current":
        default = entry["embedding"]["default"]
        for model, info in default.items():
            print(f"  embedded with model file '{model}' at {info.get('at')}")


def main() -> int:
    params = load_params()
    env = load_env_settings(params)
    sources = load_sources(params)

    if len(sys.argv) > 1:
        lookup(sources, env, sys.argv[1])
    else:
        summarize(sources, env)
    return 0


if __name__ == "__main__":
    sys.exit(main())
