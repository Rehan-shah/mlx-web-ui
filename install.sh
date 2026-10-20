#!/bin/bash
set -euo pipefail

if [ "$(uname -s)" != "Darwin" ] || [ "$(uname -m)" != "arm64" ]; then
    echo "MLX Web UI requires macOS on Apple silicon (arm64)." >&2
    exit 1
fi

# Install Homebrew if not already installed
if command -v brew > /dev/null 2>&1; then
    echo "brew already installed"
else
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo; echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# Install Python if not already installed
if python3 --version > /dev/null 2>&1; then
    echo "python already installed"
else
    brew install python
fi

# Install Git if not already installed
if git --version > /dev/null 2>&1; then
    echo "git already installed"
else
    brew install git
fi

# Install Git LFS if not already installed
if git lfs version > /dev/null 2>&1; then
    echo "git lfs already installed"
else
    brew install git-lfs
fi

# Install Bun if not already installed
if bun -v > /dev/null 2>&1; then
    echo "bun already installed"
else
    curl -fsSL https://bun.sh/install | bash
    sleep 5
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    echo 'export BUN_INSTALL="$HOME/.bun"' >> "$HOME/.zshrc"
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> "$HOME/.zshrc"
fi

# Install Miniconda if not already installed
if conda --version > /dev/null 2>&1; then
    echo "Conda is installed."
else
    brew install --cask miniconda
fi

# conda's shell hooks reference unset variables
set +u
eval "$(conda shell.bash hook)"
set -u

# Clone the repository (or reuse an existing clone)
if [ -d mlx-web-ui/.git ]; then
    echo "mlx-web-ui already cloned; pulling latest changes"
    git -C mlx-web-ui pull --ff-only
elif [ -e mlx-web-ui ]; then
    echo "./mlx-web-ui exists but is not a git clone; move it and re-run." >&2
    exit 1
else
    git clone https://github.com/Rehan-shah/mlx-web-ui.git
fi

cd mlx-web-ui/backend
if conda env list | awk '{print $1}' | grep -qx mlx-backend; then
    conda env update --file environment.yml --prune
else
    conda env create -f environment.yml
fi

# Download and convert the embedding model used for RAG
set +u
conda activate mlx-backend
set -u
python convert_bert.py

cd ../frontend
bun install
cd ../

echo ""
echo "Everything is installed. Run: cd mlx-web-ui && bash main.sh"
