
#!/bin/bash

# Install Homebrew if not already installed
if  brew -v  > /dev/null; then
    echo "brew already installed"
else
    echo "yo yo"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo ;echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> $HOME/.zprofile
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# Install Python if not already installed
if python3 --version  > /dev/null; then
    echo "python already installed"
else
    brew install python
fi

# Install Git if not already installed
if git-lfs version  > /dev/null; then
    echo "git lfs already installed"
else
    brew install git-lfs
fi



if git -v  > /dev/null; then
    echo "git already installed"
else
    brew install git
fi

# Install Bun if not already installed
if bun -v  > /dev/null; then
    echo "bun already installed"
else
    curl -fsSL https://bun.sh/install | bash
    wait 5
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    echo 'export BUN_INSTALL="$HOME/.bun"' >> $HOME/.zshrc
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> $HOME/.zshrc
    source $HOME/.zshrc
fi

# Install Miniconda if not already installed
if conda --version > /dev/null; then
    echo "Conda is installed."
else
    brew install --cask miniconda
    eval "$(conda "shell.$(basename "${SHELL}")" hook)"
fi


if huggingface-cli env > /dev/null; then
    echo "Huggingface is installed."
else
    brew install huggingface-cli
    huggingface-cli login
fi


# Clone the repository and set up the environment
git clone https://github.com/Rehan-shah/mlx-web-ui.git 
cd mlx-web-ui/backend
conda env create -f environment.yml 
cd ../frontend
bun install
cd ../

echo ""
echo "Yay! Everything is installed. 🎉"
