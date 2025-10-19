#!/usr/bin/env python3
"""
Get Position IDs for Frontend Configuration

This script retrieves position IDs from the database and generates
the TypeScript configuration code for the frontend permissions system.

Usage:
    python scripts/get_position_ids.py
"""

import asyncio
import sys
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal
from app.models import Position

logger = logging.getLogger(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


async def get_position_ids():
    """Retrieve position IDs and generate frontend config."""
    
    print("\n" + "="*70)
    print("POSITION IDs FOR FRONTEND CONFIGURATION")
    print("="*70)
    
    async with AsyncSessionLocal() as db:
        try:
            # Get all positions
            query = select(Position).where(Position.is_active == True)
            result = await db.execute(query)
            positions = result.scalars().all()
            
            if not positions:
                print("\n⚠️ No positions found in database")
                print("   Run: python scripts/seed_test_users.py")
                return False
            
            print(f"\n📋 Found {len(positions)} positions:")
            print("")
            
            # Display positions
            for pos in positions:
                print(f"   {pos.name}")
                print(f"   ID: {pos.id}")
                print(f"   Description: {pos.description or 'N/A'}")
                print("")
            
            # Generate TypeScript configuration
            print("="*70)
            print("TYPESCRIPT CONFIGURATION")
            print("="*70)
            print("\nCopy this to: lc-workflow-frontend/src/config/permissions.ts")
            print("")
            print("```typescript")
            print("export const POSITION_PERMISSIONS: PositionCapability[] = [")
            
            # Map positions to capabilities
            position_capabilities = {
                "Teller": ["start_teller_processing", "submit_to_manager"],
                "Branch Manager": ["approve_application", "reject_application"],
                "Portfolio Officer": ["create_application_for_customer"],
                "Credit Officer": ["start_teller_processing", "submit_to_manager"],
            }
            
            for pos in positions:
                capabilities = position_capabilities.get(pos.name, [])
                if capabilities:
                    print(f"  {{")
                    print(f"    positionId: '{pos.id}',")
                    print(f"    positionName: '{pos.name}',")
                    print(f"    capabilities: {capabilities},")
                    print(f"  }},")
            
            print("];")
            print("```")
            
            # Generate SQL query for reference
            print("\n" + "="*70)
            print("SQL QUERY FOR REFERENCE")
            print("="*70)
            print("\n```sql")
            print("SELECT id, name, description")
            print("FROM positions")
            print("WHERE is_active = true")
            print("ORDER BY name;")
            print("```")
            
            # Generate position mapping for backend
            print("\n" + "="*70)
            print("PYTHON CONSTANTS FOR BACKEND")
            print("="*70)
            print("\nAdd to backend configuration if needed:")
            print("")
            print("```python")
            print("# Position IDs for permission checks")
            
            for pos in positions:
                const_name = pos.name.upper().replace(" ", "_").replace("-", "_")
                print(f"{const_name}_POSITION_ID = '{pos.id}'")
            
            print("")
            print("# Position capability mapping")
            print("POSITION_CAPABILITIES = {")
            
            for pos in positions:
                capabilities = position_capabilities.get(pos.name, [])
                if capabilities:
                    print(f"    '{pos.id}': {capabilities},")
            
            print("}")
            print("```")
            
            print("\n" + "="*70)
            print("NEXT STEPS")
            print("="*70)
            print("\n1. Copy the TypeScript configuration above")
            print("2. Update: lc-workflow-frontend/src/config/permissions.ts")
            print("3. Restart the frontend development server")
            print("4. Test position-based permissions")
            print("")
            
            return True
            
        except Exception as e:
            logger.error(f"Error retrieving position IDs: {e}")
            print(f"\n❌ Error: {e}")
            return False


async def main():
    """Main function."""
    try:
        success = await get_position_ids()
        return success
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        print(f"\n❌ Fatal error: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
