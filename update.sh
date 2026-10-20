#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

# Git repository update
if ! git rev-parse --abbrev-ref --symbolic-full-name '@{u}' > /dev/null 2>&1; then
    echo "Current branch is not tracking any remote branch."
    exit 0
fi

git fetch
if [ "$(git rev-list --count 'HEAD..@{u}')" -eq 0 ]; then
    echo "The repository is already up to date."
    exit 0
fi

git pull --ff-only

set +u
eval "$(conda shell.bash hook)"
conda activate mlx-backend
set -u

(cd ./backend && conda env update --file environment.yml --prune) &
backend_pid=$!
(cd ./frontend && bun install) &
frontend_pid=$!
wait "$backend_pid"
wait "$frontend_pid"
echo "The repository has been updated."
