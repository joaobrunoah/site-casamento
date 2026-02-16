#!/bin/bash

# Script to view Firebase emulator logs in real-time

echo "📋 Viewing Firebase emulator logs..."
echo "Press Ctrl+C to stop"
echo ""

if [ -f "/tmp/firebase-emulators.log" ]; then
    tail -f /tmp/firebase-emulators.log
else
    echo "❌ Log file not found: /tmp/firebase-emulators.log"
    echo "Make sure the emulators are running first."
    exit 1
fi
