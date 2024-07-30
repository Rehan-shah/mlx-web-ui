
#!/bin/bash

lsof -i :5173 -i :8000 | awk 'NR>1 {print $2}' | xargs kill -9

bash update.sh

# Initialize conda
eval "$(conda shell.bash hook)"
conda activate mlx-backend

# Start frontend and backend servers in the same process group
(cd ./frontend && bun run dev 2> frontend-error.log && echo "started forontend") &
(cd ./backend && python main.py 2> backend-error.log && echo "started backend") &
# Open the URL in the default browser
sleep 5 # Give some time for servers to start
open "http://localhost:5173/"

# Wait for all background jobs to finish (this will capture Ctrl+C)
wait
