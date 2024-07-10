
#!/bin/bash



eval "$(conda shell.bash hook)"
conda activate mlx-backend

pip install mlx --upgrade
pip install mlx_lm --upgrade

echo "Updated mlx and mlx_lm"

git fetch

current_branch=$(git rev-parse --abbrev-ref HEAD)

local_commit=$(git rev-parse $current_branch)
remote_commit=$(git rev-parse origin/$current_branch)

if [ "$local_commit" == "$remote_commit" ]; then
    echo "The repository is already up to date."
else
    cd ./backend
    conda env update --file local.yml --prune
    cd ../frontend
    bun i

    echo "The repository has been updated."
fi

