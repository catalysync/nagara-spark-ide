#!/bin/bash
export JAVA_HOME=/home/codespace/java/21.0.9-ms
export PATH=$JAVA_HOME/bin:$PATH
echo "Using Java: $(java -version 2>&1 | head -1)"
cd /workspaces/codespaces-blank/nagara-spark-ide/backend
exec python3 main.py
