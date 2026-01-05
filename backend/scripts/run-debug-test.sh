#!/bin/bash
cd /mnt/d/work/node/golf_swing_system/backend
fuser -k 3003/tcp 2>/dev/null
sleep 1
echo "Starting server..."
node dist/main.js > /tmp/server-debug.log 2>&1 &
SERVER_PID=$!
sleep 6
echo "Server started (PID: $SERVER_PID)"
echo "Running API test..."
node scripts/test-body-posture-api.js 2>&1
echo ""
echo "=== Server Debug Output ==="
grep "DEBUG" /tmp/server-debug.log | head -50
echo ""
echo "=== REMO API Related Logs ==="
grep -i "REMO\|base64\|buffer" /tmp/server-debug.log | head -30
