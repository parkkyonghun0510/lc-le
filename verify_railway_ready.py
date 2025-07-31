#!/usr/bin/env python3
"""
Railway Deployment Verification Script
Run this script to verify your project is ready for Railway deployment
"""

import os
import sys

def check_file(file_path):
    """Check if file exists and is not empty"""
    if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
        return True
    return False

def check_requirements():
    """Check if all required packages are in requirements.txt"""
    required_packages = [
        'fastapi',
        'uvicorn',
        'sqlalchemy',
        'psycopg2-binary',
        'alembic',
        'asyncpg',
        'pydantic-settings'
    ]
    
    try:
        with open('requirements.txt', 'r') as f:
            content = f.read().lower()
            missing = [pkg for pkg in required_packages if pkg.lower() not in content]
            return missing
    except FileNotFoundError:
        return required_packages

def main():
    print("🔍 Railway Deployment Verification")
    print("=" * 40)
    
    # Check required files
    required_files = {
        'Procfile': 'Railway deployment command',
        'railway.toml': 'Railway configuration',
        'requirements.txt': 'Python dependencies',
        'app/main.py': 'FastAPI application entry point',
        'app/core/config.py': 'Configuration settings',
        '.gitignore': 'Git ignore rules'
    }
    
    all_good = True
    
    for file, description in required_files.items():
        if check_file(file):
            print(f"✅ {file} - {description}")
        else:
            print(f"❌ {file} - {description}")
            all_good = False
    
    # Check requirements
    missing_packages = check_requirements()
    if missing_packages:
        print(f"⚠️  Missing packages in requirements.txt: {missing_packages}")
        all_good = False
    else:
        print("✅ All required packages found")
    
    # Generate secret key
    import secrets
    secret_key = secrets.token_urlsafe(32)
    print(f"\n🔑 Your Railway SECRET_KEY:")
    print(f"{secret_key}")
    print("💡 Copy this to Railway environment variables")
    
    print("\n🚀 Ready to deploy!")
    print("Next steps:")
    print("1. Push to GitHub")
    print("2. Connect GitHub repo to Railway")
    print("3. Add PostgreSQL service")
    print("4. Add MinIO service")
    print("5. Set environment variables")
    print("6. Deploy!")
    
    if all_good:
        print("\n✅ Your project is ready for Railway deployment!")
    else:
        print("\n⚠️  Please fix the issues above before deploying")

if __name__ == "__main__":
    main()