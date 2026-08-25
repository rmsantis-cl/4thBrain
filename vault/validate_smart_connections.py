"""Validate a Smart Connections + MCP install against vault/params.json."""

import json
import shutil
import subprocess
import sys
from pathlib import Path

PARAMS_FILE = Path(__file__).parent.parent / "params.json"


def load_params() -> dict:
    with open(PARAMS_FILE, encoding="utf-8") as f:
        return json.load(f)


def check(label: str, ok: bool, detail: str = "") -> bool:
    status = "PASS" if ok else "FAIL"
    line = f"[{status}] {label}"
    if detail:
        line += f" — {detail}"
    print(line)
    return ok


def check_vault_dir(vault_dir: str) -> bool:
    return check("vault_dir exists", Path(vault_dir).is_dir(), vault_dir)


def check_smart_env(vault_dir: str, smart_env_dir: str) -> bool:
    path = Path(vault_dir) / smart_env_dir
    return check(f"{smart_env_dir} present (embeddings indexed)", path.is_dir(), str(path))


def check_npx() -> bool:
    npx = shutil.which("npx")
    return check("npx available", npx is not None, npx or "not found on PATH")


def check_mcp_registered(mcp_server_name: str) -> bool:
    claude = shutil.which("claude")
    if claude is None:
        return check("claude CLI available", False, "not found on PATH")
    try:
        result = subprocess.run(
            ["claude", "mcp", "list"],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except (subprocess.SubprocessError, OSError) as exc:
        return check(f"{mcp_server_name} registered", False, f"claude mcp list failed: {exc}")
    registered = mcp_server_name in result.stdout
    return check(f"{mcp_server_name} registered", registered, result.stdout.strip() or result.stderr.strip())


def main() -> int:
    params = load_params()
    results = [
        check_vault_dir(params["vault_dir"]),
        check_smart_env(params["vault_dir"], params["smart_env_dir"]),
        check_npx(),
        check_mcp_registered(params["mcp_server_name"]),
    ]
    print()
    if all(results):
        print("All checks passed.")
        return 0
    print("One or more checks failed. See Instructions.md for remediation.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
