
#!/bin/bash

#!/bin/bash

# Initialize conda
eval "$(conda shell.bash hook)"
conda init
conda activate mlx

# Start frontend and backend servers in the same process group
(cd ./frontend && bun run dev) &
(cd ./backend && python main.py) &

# Open the URL in the default browser
sleep 5 # Give some time for servers to start
open "http://localhost:5173/"

# Wait for all background jobs to finish (this will capture Ctrl+C)
wait
