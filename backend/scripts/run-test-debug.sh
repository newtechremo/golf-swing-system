#!/bin/bash
cd /mnt/d/work/node/golf_swing_system/backend
fuser -k 3003/tcp 2>/dev/null
sleep 2
echo "Starting server..."
node dist/main.js > /tmp/server-debug-full.log 2>&1 &
SERVER_PID=$!
sleep 5
echo "Server started (PID: $SERVER_PID)"
echo ""
echo "Running API test..."
timeout 120 node scripts/test-body-posture-api.js 2>&1
echo ""
echo "=== SERVER DEBUG OUTPUT ==="
grep -E "REMO|DEBUG|base64|buffer" /tmp/server-debug-full.log | head -100
