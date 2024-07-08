
#!/bin/bash

# Function to fetch updates and check if there are new commits
check_git_fetch() {
    #
    conda init 
    conda activate mlx-backend
    # Fetch updates from the remote repository

    pip install mlx --upgrade
    pip install mlx_lm --upgrade

    echo "Upadted mlx and mlx_lm"

    git fetch

    # Get the name of the current branch
    current_branch=$(git rev-parse --abbrev-ref HEAD)

    # Get the commit hashes of the local and remote branches
    local_commit=$(git rev-parse $current_branch)
    remote_commit=$(git rev-parse origin/$current_branch)

    # Compare the commit hashes
    if [ "$local_commit" == "$remote_commit" ]; then
        echo "The repository is already up to date."
    else
        cd ./backend
        conda env update --file local.yml --prune
        cd ../frontend
        bun i

        echo "The repository has been updated."
    fi

}


check_git_fetch
