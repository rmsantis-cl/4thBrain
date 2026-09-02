#!/bin/bash
# scripts/wsl-init.sh
#
# WSL2 Ollama initialization script (Fedora).
# Invoked by the PowerShell bootstrap wrapper.
#
# Responsibilities:
# 1. Check if Ollama is installed
# 2. Start/verify Ollama service via systemd
# 3. Wait for Ollama HTTP endpoint (http://localhost:11434)
# 4. Output structured JSON logs
# 5. Return exit code 0 on success, 1 on failure
#
# Usage (from Windows):
#   wsl --exec bash -c "$(cat scripts/wsl-init.sh)" 2>&1 | tee wsl-init.log
#
# Structured logging matches server/bootstrap.js and batch/worker.js pattern.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Structured logging function
log_json() {
  local level="${1:-info}"
  local component="${2:-wsl-init}"
  local event="$3"
  shift 3

  # Build JSON payload with remaining key=value pairs
  local json="{\"timestamp\":\"$(date -u +'%Y-%m-%dT%H:%M:%S.000Z')\",\"component\":\"$component\",\"level\":\"$level\",\"event\":\"$event\""

  while [[ $# -gt 0 ]]; do
    local key="$1"
    local value="$2"
    # Simple escaping for JSON string values
    value=$(echo "$value" | sed 's/\\/\\\\/g; s/"/\\"/g')
    json="$json,\"$key\":\"$value\""
    shift 2
  done

  json="$json}"
  echo "$json"
}

# Error handler: log fatal errors and exit
fatal_error() {
  local error_msg="$1"
  log_json "error" "wsl-init" "init_failed" "error" "$error_msg"
  exit 1
}

# Check if Ollama is installed
check_ollama_installed() {
  if ! command -v ollama &> /dev/null; then
    fatal_error "Ollama not found in PATH — run 'curl -fsSL https://ollama.ai/install.sh | sh' to install"
  fi
  log_json "info" "wsl-init" "ollama_found" "path" "$(command -v ollama)"
}

# Start/enable Ollama systemd service
start_ollama_service() {
  log_json "info" "wsl-init" "starting_ollama_service"

  # Enable on startup
  systemctl enable ollama.service 2>/dev/null || {
    log_json "warn" "wsl-init" "ollama_enable_failed" "reason" "systemctl enable not available (non-systemd environment)"
  }

  # Start the service
  if systemctl is-active --quiet ollama.service; then
    log_json "info" "wsl-init" "ollama_already_running"
  else
    if ! systemctl start ollama.service; then
      fatal_error "systemctl start ollama.service failed — check 'systemctl status ollama.service' for details"
    fi
    log_json "info" "wsl-init" "ollama_service_started"
  fi
}

# Wait for Ollama HTTP endpoint to be responsive
wait_for_ollama_endpoint() {
  local max_attempts=30
  local attempt=0
  local timeout_per_attempt=1

  log_json "info" "wsl-init" "ollama_endpoint_check_started" "endpoint" "http://localhost:11434"

  while [ $attempt -lt $max_attempts ]; do
    attempt=$((attempt + 1))

    if curl -s -f -m $timeout_per_attempt http://localhost:11434/api/tags > /dev/null 2>&1; then
      local models=$(curl -s http://localhost:11434/api/tags | jq -r '.models[].name' 2>/dev/null | tr '\n' ',' | sed 's/,$//')
      log_json "info" "wsl-init" "ollama_endpoint_ready" "attempt" "$attempt" "models" "$models"
      return 0
    fi

    if [ $((attempt % 10)) -eq 0 ]; then
      log_json "info" "wsl-init" "ollama_endpoint_check_waiting" "attempt" "$attempt" "max_attempts" "$max_attempts"
    fi

    sleep 1
  done

  fatal_error "Ollama endpoint (http://localhost:11434) did not respond after ${max_attempts} seconds — service may have crashed"
}

# Ensure the target model (llama3.2:3b) is loaded
load_ollama_model() {
  local model_name="llama3.2:3b"
  local max_attempts=120  # 2 minutes to pull and load model
  local attempt=0

  log_json "info" "wsl-init" "model_check_started" "model" "$model_name"

  # Check if model is already loaded
  if curl -s http://localhost:11434/api/tags | jq -e ".models[] | select(.name == \"$model_name\")" > /dev/null 2>&1; then
    log_json "info" "wsl-init" "model_already_loaded" "model" "$model_name"
    return 0
  fi

  log_json "info" "wsl-init" "model_loading_started" "model" "$model_name"

  # Start ollama run in background to load the model
  # The model will be pulled if not present, then loaded into memory
  ollama run "$model_name" /bin/true > /dev/null 2>&1 &
  local ollama_pid=$!

  # Wait for model to be loaded (check /api/tags until model appears)
  while [ $attempt -lt $max_attempts ]; do
    attempt=$((attempt + 1))

    if curl -s http://localhost:11434/api/tags | jq -e ".models[] | select(.name == \"$model_name\")" > /dev/null 2>&1; then
      log_json "info" "wsl-init" "model_loaded" "model" "$model_name" "attempt" "$attempt"
      wait $ollama_pid 2>/dev/null || true
      return 0
    fi

    if [ $((attempt % 20)) -eq 0 ]; then
      log_json "info" "wsl-init" "model_loading_in_progress" "model" "$model_name" "attempt" "$attempt" "max_attempts" "$max_attempts"
    fi

    sleep 1
  done

  # Model didn't load in time; log warning but don't fail (might still be downloading)
  log_json "warn" "wsl-init" "model_loading_timeout" "model" "$model_name" "max_attempts" "$max_attempts" "advice" "Model may still be loading; check 'ollama list' manually"
  kill $ollama_pid 2>/dev/null || true
  return 0  # Don't fail the boot; model might load in background
}

# Main sequence
main() {
  log_json "info" "wsl-init" "init_started" "node_version" "$(node --version 2>/dev/null || echo 'N/A')"

  check_ollama_installed
  start_ollama_service
  wait_for_ollama_endpoint
  load_ollama_model  # Ensure the target model is loaded (Task-17)

  log_json "info" "wsl-init" "init_completed"
  exit 0
}

main
