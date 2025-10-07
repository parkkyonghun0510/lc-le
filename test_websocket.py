#!/usr/bin/env python3
"""
Quick test script to verify WebSocket endpoint is working
"""
import asyncio
import json
import sys
import websockets
from datetime import datetime

async def test_websocket():
    """Test WebSocket connection with authentication"""
    
    # You'll need to replace this with a valid JWT token from your login
    # Get a token by logging in at http://localhost:8090/docs and using the /api/v1/auth/login endpoint
    
    print("To test WebSocket, you need a valid JWT token.")
    print("1. Go to http://localhost:8090/docs")
    print("2. Use /api/v1/auth/login to get a token")
    print("3. Copy the access_token and run this script with: python test_websocket.py YOUR_TOKEN")
    print()
    
    if len(sys.argv) < 2:
        print("Usage: python test_websocket.py YOUR_ACCESS_TOKEN")
        return
    
    token = sys.argv[1]
    ws_url = f"ws://localhost:8090/api/v1/ws/realtime?token={token}"
    
    print(f"Connecting to: {ws_url[:60]}...")
    
    try:
        async with websockets.connect(ws_url) as websocket:
            print("✅ WebSocket connected successfully!")
            print(f"Connected at: {datetime.now().isoformat()}")
            print()
            
            # Send a ping
            print("Sending ping...")
            await websocket.send(json.dumps({"type": "ping"}))
            
            # Wait for response
            print("Waiting for response...")
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            print(f"✅ Received: {response}")
            print()
            
            # Wait for heartbeat
            print("Waiting for heartbeat (30s)...")
            heartbeat = await asyncio.wait_for(websocket.recv(), timeout=35.0)
            print(f"✅ Received heartbeat: {heartbeat}")
            print()
            
            print("WebSocket is working correctly! ✅")
            
    except websockets.exceptions.InvalidStatusCode as e:
        print(f"❌ Connection failed with status code: {e.status_code}")
        if e.status_code == 401 or e.status_code == 403:
            print("Authentication failed. Make sure your token is valid and not expired.")
        print(f"Error: {e}")
    except asyncio.TimeoutError:
        print("❌ Timeout waiting for server response")
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
