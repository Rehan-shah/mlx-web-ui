#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

PID_FILE=".server.pids"

stop_recorded() {
    [ -f "$PID_FILE" ] || return 0
    while read -r pid; do
        [ -n "$pid" ] || continue
        pkill -TERM -P "$pid" 2>/dev/null || true
        kill "$pid" 2>/dev/null || true
    done < "$PID_FILE"
    rm -f "$PID_FILE"
}

# Stop servers left over from a previous run of this script (only PIDs we recorded).
stop_recorded

bash update.sh || echo "Update check failed; continuing with the current version."

# Initialize conda (its activation scripts reference unset variables)
set +u
eval "$(conda shell.bash hook)"
conda activate mlx-backend
set -u

if [ ! -f "backend/models/bert models/all-MiniLM-L6-v2/model.npz" ]; then
    echo "Embedding model missing; downloading and converting it..."
    (cd backend && python convert_bert.py)
fi

trap 'stop_recorded' EXIT
trap 'exit 130' INT TERM

echo "Starting frontend (logs: frontend/frontend-error.log)..."
(cd frontend && exec bun run dev 2> frontend-error.log) &
echo "$!" >> "$PID_FILE"

echo "Starting backend (logs: backend/backend-error.log)..."
(cd backend && exec python main.py 2> backend-error.log) &
echo "$!" >> "$PID_FILE"

# Give the servers some time to start, then open the UI
sleep 5
open "http://localhost:5173/"

# Wait for the servers; Ctrl+C stops both via the EXIT trap
wait
