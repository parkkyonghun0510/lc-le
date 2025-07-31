#!/usr/bin/env python3
"""
Railway Deployment Helper Script
This script helps prepare your FastAPI application for Railway deployment
"""

import secrets
import os
import subprocess

def generate_secret_key():
    """Generate a secure secret key for production"""
    return secrets.token_urlsafe(32)

def check_requirements():
    """Check if all required files exist"""
    required_files = [
        'Procfile',
        'requirements.txt',
        'app/main.py',
        'app/core/config.py'
    ]
    
    missing_files = []
    for file in required_files:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_files:
        print(f"❌ Missing files: {missing_files}")
        return False
    else:
        print("✅ All required files present")
        return True

def setup_git():
    """Initialize git repository if not already done"""
    if not os.path.exists('.git'):
        print("🔄 Initializing git repository...")
        subprocess.run(['git', 'init'], capture_output=True)
        subprocess.run(['git', 'add', '.'], capture_output=True)
        subprocess.run(['git', 'commit', '-m', 'Initial Railway deployment setup'], capture_output=True)
        print("✅ Git repository initialized")
    else:
        print("✅ Git repository already exists")

def create_env_production():
    """Create production environment file template"""
    secret_key = generate_secret_key()
    
    env_content = f"""# Railway Production Environment Variables
# Add these to Railway dashboard Variables section

# Database (Railway PostgreSQL)
DATABASE_URL=postgresql+asyncpg://postgres:ILpXLUiueRVhRHLpEdgGTrVVAFDKvJfE@centerbeam.proxy.rlwy.net:47060/railway

# MinIO (Railway Bucket)
MINIO_ENDPOINT=${{CONSOLE_MINIO_SERVER}}
MINIO_ACCESS_KEY=${{USERNAME}}
MINIO_SECRET_KEY=${{PASSWORD}}
MINIO_BUCKET_NAME=lc-workflow-files
MINIO_SECURE=true

# Security
SECRET_KEY={secret_key}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ORIGINS=https://your-app.railway.app

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=false
"""
    
    with open('.env.production', 'w') as f:
        f.write(env_content)
    
    print("✅ Production environment file created: .env.production")
    print(f"🔑 Generated secure SECRET_KEY: {secret_key[:20]}...")

def main():
    print("🚀 Railway Deployment Setup")
    print("=" * 40)
    
    if not check_requirements():
        return
    
    setup_git()
    create_env_production()
    
    print("\n📋 Next Steps:")
    print("1. Create a new repository on GitHub")
    print("2. Push your code: git remote add origin <your-repo-url>")
    print("3. git push -u origin main")
    print("4. Go to Railway dashboard")
    print("5. Create new project → Deploy from GitHub")
    print("6. Add PostgreSQL service")
    print("7. Add MinIO service")
    print("8. Copy variables from .env.production to Railway Variables")
    print("9. Deploy!")

if __name__ == "__main__":
    main()