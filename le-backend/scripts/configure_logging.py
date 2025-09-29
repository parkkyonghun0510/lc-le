#!/usr/bin/env python3
"""Configure logging levels for production deployment"""

import os
import sys
import logging

def configure_production_logging():
    """Configure logging for production to reduce Railway rate limits"""

    # Set environment variables for production logging
    os.environ.setdefault("LOG_LEVEL", "WARNING")
    os.environ.setdefault("SQLALCHEMY_ECHO", "false")
    os.environ.setdefault("DEBUG", "false")

    # Configure logging
    logging.basicConfig(
        level=getattr(logging, os.getenv("LOG_LEVEL", "WARNING").upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        stream=sys.stdout
    )

    # Reduce SQLAlchemy logging
    logging.getLogger('sqlalchemy.engine').setLevel(logging.ERROR)
    logging.getLogger('sqlalchemy.pool').setLevel(logging.ERROR)
    logging.getLogger('sqlalchemy.orm').setLevel(logging.WARNING)

    print("✅ Production logging configured")
    print(f"📊 Log level: {os.getenv('LOG_LEVEL', 'WARNING')}")
    print(f"🔇 SQL echo: {os.getenv('SQLALCHEMY_ECHO', 'false')}")
    print(f"🐛 Debug mode: {os.getenv('DEBUG', 'false')}")

if __name__ == "__main__":
    configure_production_logging()
