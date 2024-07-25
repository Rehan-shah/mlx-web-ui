#!/bin/bash

eval "$(conda shell.bash hook)"
conda activate mlx-backend

# Function to get the last modification time of a package
get_last_modified() {
    local package=$1
    pip show $package | grep -i "last-modified" | cut -d' ' -f2-
}

# Get the last check time
last_check_file=".last_check_time"
if [ -f "$last_check_file" ]; then
    last_check_time=$(cat "$last_check_file")
else
    last_check_time="2000-01-01"
fi

# Check if any package has been modified since the last check
mlx_modified=$(get_last_modified mlx)
mlx_lm_modified=$(get_last_modified mlx_lm)

needs_upgrade=false
if [[ "$mlx_modified" > "$last_check_time" ]]; then
    needs_upgrade=true
    echo "mlx requires upgrade"
fi
if [[ "$mlx_lm_modified" > "$last_check_time" ]]; then
    needs_upgrade=true
    echo "mlx_lm requires upgrade"
fi

if $needs_upgrade; then
    pip install mlx mlx_lm --upgrade
    echo "Updated mlx and mlx_lm"
else
    echo "mlx and mlx_lm are already up to date"
fi

# Update the last check time
date -u +"%Y-%m-%d" > "$last_check_file"

# Git repository update
current_branch=$(git rev-parse --abbrev-ref HEAD)
tracking_branch=$(git rev-parse --abbrev-ref "$current_branch@{u}" 2>/dev/null)

if [ -n "$tracking_branch" ]; then
    git fetch
    if [ $(git rev-list HEAD...origin/$current_branch --count) != 0 ]; then
        git pull
        (cd ./backend && conda env update --file environment.yml --prune) &
        (cd ./frontend && bun i) &
        wait
        echo "The repository has been updated."
    else
        echo "The repository is already up to date."
    fi
else
    echo "Current branch is not tracking any remote branch."
fi
