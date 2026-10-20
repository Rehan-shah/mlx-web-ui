

# MLX Web UI

Hello, this repo is an easy way to run a web server for MLX. The design is very minimalistic and contains multiple features like:

- Supports **RAG**
- Tokens per sec info on screen
- Support for Latex and code formatting (allows to copy the code snippet )
- Ability to set model params (top p, temp, role mapping...)
- Ability to set default params
- Install model from Web server itself
- Save previous conversations and load from there
- Copy response through a button 
- Chat with models, stop conversation
- Swap models easily

And more coming soon like:

- [ ] Multi-model support
- [ ] Dark mode
- [ ] Togglable Sidebar


Here is photo of the UI
![UI look img](https://i.ibb.co/nLGJ3Z1/New-Chat-Llama.png)

## Installation

Requires macOS on Apple silicon (arm64). The installer sets up Homebrew, Python, Git, Bun and Miniconda if they are missing.

Run this command (without `sudo`) to install:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/Rehan-shah/mlx-web-ui/main/install.sh)"
```

## Getting Started

After installation, navigate to the `mlx-web-ui` directory:

```
cd mlx-web-ui
```

To start the server, run:

```
bash main.sh
```

This will start the web server on `http://localhost:5173`. The backend listens on `http://127.0.0.1:8000` (localhost only).

Models live in `backend/models/` (the default `./models` path in the UI); the backend refuses paths outside that folder. The RAG embedding model (`all-MiniLM-L6-v2`) is downloaded and converted to MLX by the installer; to (re)create it manually run `python convert_bert.py` inside `backend/` with the `mlx-backend` conda env active. Uploaded documents are stored in `backend/chroma_db/`.

## Troubleshooting
Try updating the web-ui version and running again. It can be done using this script:
```
bash update.sh
```

If the issue still exists, please open an issue in this repo.



## Using RAG

To use rag you could click the paper pin icon in the textbox and then select the file you want to use.
