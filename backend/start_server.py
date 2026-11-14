#!/usr/bin/env python3
"""
Smart Student Productivity Assistant - Production Server Startup
Configures the FastAPI server to listen on 0.0.0.0:8080
Serves the React production build alongside the API.
"""

import os
import sys
import uvicorn

# Production configuration
os.environ.setdefault("PORT", "8080")
os.environ.setdefault("HOST", "0.0.0.0")
os.environ.setdefault("CORS_ORIGINS", "*")

def main():
    port = int(os.environ.get("PORT", "8080"))
    host = os.environ.get("HOST", "0.0.0.0")
    
    print("=" * 60)
    print("StudySphere Production Server")
    print("=" * 60)
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"Local URL:  http://127.0.0.1:{port}")
    print("Public URL: provided by your host / tunnel (see DEPLOY_PUBLIC.md)")
    print("=" * 60)
    
    # Run uvicorn with production settings
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        log_level="info",
        access_log=True,
        reload=False,  # Disable reload in production
        proxy_headers=True,
        forwarded_allow_ips="*",
    )

if __name__ == "__main__":
    main()