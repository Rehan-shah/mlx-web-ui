#!/bin/bash

if brew ls --versions bun > /dev/null; then
    echo "brew already installed"
else
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

if python3  --versions bun > /dev/null; then
    echo "python already installed"
else
    brew install python
fi



if git --version 2>/dev/null; then
    echo "git already installed"
else
    brew install git
fi


if bun --version 2>/dev/null; then
    echo "bun already installed"
else
    curl -fsSL https://bun.sh/install | bash
fi

if conda -V 2>/dev/null; then
    echo "Conda is installed."
else
    brew install --cask miniconda
fi

git clone https://github.com/Rehan-shah/mlx-web-ui.git

cd mlx-web-ui
cd backend
conda env create -f environment.yml 
cd ../frontend
bun install
cd ../


echo "Yay! Everything is installed. 🎉"
