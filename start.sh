#!/bin/bash
set -e

echo "=== Nagara Spark IDE ==="
echo ""

# Use Java 21 (PySpark 3.5 doesn't support Java 25)
export JAVA_HOME=/home/codespace/java/21.0.9-ms
export PATH=$JAVA_HOME/bin:$PATH

# Start backend
echo "Starting backend (FastAPI + PySpark)..."
cd /workspaces/codespaces-blank/nagara-spark-ide/backend
python3 main.py &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for Spark to initialize..."
for i in $(seq 1 60); do
  if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "Backend ready!"
    break
  fi
  sleep 2
done

# Start frontend
echo "Starting frontend (Vite)..."
cd /workspaces/codespaces-blank/nagara-spark-ide/frontend
npx vite --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

echo ""
echo "Nagara Spark IDE is running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  Spark UI: http://localhost:4040"
echo ""
echo "Press Ctrl+C to stop"

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
