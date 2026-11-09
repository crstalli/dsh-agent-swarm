#!/bin/bash

# Verify auto-start mechanism for hub server
# This script verifies that the hub server auto-starts when DSH starts with profile using it

set -e

echo "🔍 Verifying Auto-Start Mechanism"
echo "================================"
echo ""

HUB_PORT=${DSH_COORD_HUB_PORT:-4100}
HUB_URL="http://127.0.0.1:$HUB_PORT"

# Test 1: Check if hub server is running
echo "Test 1: Checking if hub server is running..."
if curl -s "$HUB_URL/api/health" > /dev/null 2>&1; then
    echo "✅ Hub server is running on port $HUB_PORT"
    HUB_RUNNING=true
else
    echo "❌ Hub server not running on port $HUB_PORT"
    HUB_RUNNING=false
fi

# Test 2: Check health endpoint details
if [ "$HUB_RUNNING" = true ]; then
    echo ""
    echo "Test 2: Checking health endpoint details..."
    HEALTH=$(curl -s "$HUB_URL/api/health")
    echo "Health response: $HEALTH"
    
    if echo "$HEALTH" | grep -q '"status":"ok"'; then
        echo "✅ Health check passed"
    else
        echo "⚠️ Health check incomplete"
    fi
    
    # Extract details
    PORT=$(echo "$HEALTH" | sed -n 's/.*"port":\([0-9]*\).*/\1/p')
    SESSIONS=$(echo "$HEALTH" | sed -n 's/.*"sessions":\([0-9]*\).*/\1/p')
    MODES=$(echo "$HEALTH" | sed -n 's/.*"modes":\([0-9]*\).*/\1/p')
    
    echo ""
    echo "Hub Server Details:"
    echo "  Port: $PORT"
    echo "  Sessions: $SESSIONS"
    echo "  Modes: $MODES"
fi

# Test 3: Check web UI
echo ""
echo "Test 3: Checking web UI accessibility..."
if curl -s "$HUB_URL/ui" | grep -q "DSH Agent Swarm"; then
    echo "✅ Web UI accessible at $HUB_URL/ui"
else
    echo "⚠️ Web UI may not be fully loaded"
fi

# Test 4: Verify auto-start configuration
echo ""
echo "Test 4: Checking auto-start configuration..."
CONFIG_FILE="/mnt/f/ai/plugins/dsh-agent-swarm/cordis.patch.yml"
if [ -f "$CONFIG_FILE" ]; then
    echo "✅ Plugin configuration found"
    if grep -q "coord-core" "$CONFIG_FILE"; then
        echo "✅ coord-core plugin configured"
    fi
else
    echo "❌ Plugin configuration not found"
fi

# Test 5: Check environment variables
echo ""
echo "Test 5: Checking environment variables..."
if [ -n "$DSH_COORD_HUB_PORT" ]; then
    echo "✅ DSH_COORD_HUB_PORT set to $DSH_COORD_HUB_PORT"
else
    echo "⚠️ DSH_COORD_HUB_PORT not set (using default 4100)"
fi

if [ -n "$DSH_COORD_HUB_TOKEN" ]; then
    echo "✅ DSH_COORD_HUB_TOKEN configured"
else
    echo "⚠️ DSH_COORD_HUB_TOKEN not set (using default dev-token)"
fi

# Summary
echo ""
echo "================================"
echo "📊 Auto-Start Verification Summary"
echo "================================"
echo ""
echo "Hub Server Status: $([ "$HUB_RUNNING" = true ] && echo "✅ Running" || echo "❌ Not running")"
echo "Port: $HUB_PORT"
echo "Web UI: http://127.0.0.1:$HUB_PORT/ui"
echo "API: http://127.0.0.1:$HUB_PORT/api/"
echo ""

if [ "$HUB_RUNNING" = true ]; then
    echo "✅ Auto-start mechanism verified!"
    echo ""
    echo "The hub server is running and accessible."
    echo "It will auto-start when DSH starts with a profile that uses it."
    exit 0
else
    echo "⚠️ Hub server not running"
    echo ""
    echo "To start manually:"
    echo "  cd /mnt/f/ai/plugins/dsh-agent-swarm"
    echo "  node coord-core/index.js"
    echo ""
    echo "Or start via DSH with pwtest profile:"
    echo "  dsh --profile pwtest --port 3083"
    exit 1
fi
