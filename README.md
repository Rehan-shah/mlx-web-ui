# MLX Web UI

Hello, this repo is an easy way to run a web server for MLX. The design is very minimalistic and contains multiple features like:

- Ability to set model params (top p, temp, role mapping...)
- Ability to set default params
- Install model from Web server itself
- Save previous conversations and load from there
- Chat with models, stop conversation
- Swap models easily

And more coming soon like:

- [ ] Multi-model support
- [ ] RAG and knowledge graph support (chat with large documents )



Here is photo of the UI
![UI look img](  https://private-user-images.githubusercontent.com/65281592/332003779-4667ea2a-3c68-4606-8ad3-f354820f8dbd.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3MTYxOTU1NzMsIm5iZiI6MTcxNjE5NTI3MywicGF0aCI6Ii82NTI4MTU5Mi8zMzIwMDM3NzktNDY2N2VhMmEtM2M2OC00NjA2LThhZDMtZjM1NDgyMGY4ZGJkLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNDA1MjAlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjQwNTIwVDA4NTQzM1omWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTQ4MDNmODgzYWVkNTA1MjZhMzZhMGZhYmY1ZWNiNTg5ODYwNzdkNzgzNmJlMjVjN2RiNmVkYmViZDQ0NmRlMmUmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0JmFjdG9yX2lkPTAma2V5X2lkPTAmcmVwb19pZD0wIn0.hjU95esbtwAdIZ50yCHYnvesKJl7vcNxIeDnHVCMTfM )


## Installation

No pre-requisites or dependencies needed.

You would only need to run this command to install:

```bash
bash -c "$(curl -s https://raw.githubusercontent.com/Rehan-shah/mlx-web-ui/main/install.sh)"
```

## Getting Started

After installation, navigate to the `mlx-web-ui` directory:

```
cd ../mlx-web-ui
```

To start the server, run:

```
bash main.sh
```

This will start the web server on `http://localhost:5173`. Open your web browser and navigate to `http://localhost:5173` to access the MLX Web UI.

