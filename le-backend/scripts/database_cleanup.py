#!/usr/bin/env python3
"""
Comprehensive Database Cleanup Script for System Stability Improvements

This script provides a command-line interface for database cleanup operations,
including duplicate folder consolidation, rollback capabilities, and integrity verification.

Usage:
    python scripts/database_cleanup.py --help
    python scripts/database_cleanup.py --dry-run
    python scripts/database_cleanup.py --cleanup
    python scripts/database_cleanup.py --verify
    python scripts/database_cleanup.py --rollback <rollback_id>

Requirements addressed: 4.1, 4.2, 4.3, 4.4, 4.5
"""

import asyncio
import argparse
import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Optional

# Add the app directory to the path
sys.path.append(str(Path(__file__).parent.parent))

from app.database import AsyncSessionLocal
from app.services.database_cleanup_service import cleanup_service
from app.services.automated_cleanup_service import automated_cleanup_service


def print_banner():
    """Print script banner"""
    print("=" * 80)
    print("Database Cleanup Script - System Stability Improvements")
    print("=" * 80)
    print()


def print_report(report):
    """Print cleanup report in a formatted way"""
    print("\n" + "=" * 60)
    print("CLEANUP REPORT")
    print("=" * 60)
    print(f"Start Time: {report.start_time}")
    print(f"End Time: {report.end_time}")
    print(f"Duration: {(report.end_time - report.start_time).total_seconds():.2f} seconds")
    print()
    print(f"Total Applications: {report.total_applications}")
    print(f"Successful Cleanups: {report.successful_cleanups}")
    print(f"Failed Cleanups: {report.failed_cleanups}")
    print()
    print(f"Total Folders Removed: {report.total_folders_removed}")
    print(f"Total Files Moved: {report.total_files_moved}")
    print(f"Total Child Folders Merged: {report.total_child_folders_merged}")
    print()
    
    if report.results:
        print("DETAILED RESULTS:")
        print("-" * 40)
        for result in report.results:
            status_icon = "✅" if result.status.value == "completed" else "❌"
            print(f"{status_icon} Application {result.application_id}")
            print(f"   Status: {result.status.value}")
            print(f"   Folders Removed: {result.folders_removed}")
            print(f"   Files Moved: {result.files_moved}")
            print(f"   Child Folders Merged: {result.child_folders_merged}")
            if result.error_message:
                print(f"   Error: {result.error_message}")
            if result.rollback_id:
                print(f"   Rollback ID: {result.rollback_id}")
            print()


def print_verification_results(results):
    """Print verification results in a formatted way"""
    print("\n" + "=" * 60)
    print("INTEGRITY VERIFICATION RESULTS")
    print("=" * 60)
    
    if results.get('verification_passed', False):
        print("✅ VERIFICATION PASSED - Database integrity is good")
    else:
        print("❌ VERIFICATION FAILED - Issues found")
    
    print()
    print(f"Duplicate Parent Folders: {results.get('duplicate_parent_folders', 0)}")
    print(f"Orphaned Files: {results.get('orphaned_files', 0)}")
    print(f"Orphaned Folders: {results.get('orphaned_folders', 0)}")
    
    if results.get('inconsistent_applications'):
        print(f"\nInconsistent Applications:")
        for app_id in results['inconsistent_applications']:
            print(f"  - {app_id}")
    
    if results.get('error'):
        print(f"\nError: {results['error']}")


async def run_dry_run():
    """Run a dry run to show what would be cleaned up"""
    print("🔍 Running dry run analysis...")
    print("This will show what would be cleaned up without making any changes.")
    print()
    
    async with AsyncSessionLocal() as db:
        # Find applications with duplicates
        duplicate_apps = await cleanup_service.find_applications_with_duplicate_folders(db)
        
        if not duplicate_apps:
            print("✅ No applications with duplicate parent folders found!")
            print("Database appears to be clean.")
            return
        
        print(f"Found {len(duplicate_apps)} applications with duplicate parent folders:")
        print()
        
        for app_id, count in duplicate_apps:
            print(f"📁 Application {app_id}: {count} parent folders")
        
        print()
        print("To perform the actual cleanup, run:")
        print("  python scripts/database_cleanup.py --cleanup")


async def run_cleanup(force: bool = False):
    """Run the actual cleanup operation"""
    if not force:
        print("⚠️  WARNING: This will modify your database!")
        print("This operation will:")
        print("  - Consolidate duplicate parent folders")
        print("  - Move files and child folders as needed")
        print("  - Create rollback points for safety")
        print()
        
        response = input("Are you sure you want to proceed? (yes/no): ").lower().strip()
        if response != 'yes':
            print("Operation cancelled.")
            return
    
    print("🧹 Starting database cleanup...")
    print()
    
    async with AsyncSessionLocal() as db:
        report = await cleanup_service.cleanup_all_duplicate_folders(db, dry_run=False)
        print_report(report)
        
        if report.failed_cleanups > 0:
            print("\n⚠️  Some cleanups failed. Check the detailed results above.")
            print("You can use the rollback IDs to revert changes if needed.")
        else:
            print("\n🎉 All cleanups completed successfully!")


async def run_verification():
    """Run integrity verification"""
    print("🔍 Running database integrity verification...")
    print()
    
    async with AsyncSessionLocal() as db:
        results = await cleanup_service.verify_cleanup_integrity(db)
        print_verification_results(results)


async def run_rollback(rollback_id: str):
    """Run rollback operation"""
    print(f"🔄 Rolling back cleanup operation: {rollback_id}")
    print()
    
    async with AsyncSessionLocal() as db:
        success = await cleanup_service.rollback_cleanup(db, rollback_id)
        
        if success:
            print("✅ Rollback completed successfully!")
        else:
            print("❌ Rollback failed. Check logs for details.")


async def show_service_status():
    """Show automated service status"""
    print("📊 Automated Cleanup Service Status")
    print("=" * 50)
    
    status = automated_cleanup_service.get_service_status()
    
    print(f"Service Running: {'✅ Yes' if status['running'] else '❌ No'}")
    print()
    
    print("Schedules:")
    for name, schedule in status['schedules'].items():
        enabled_icon = "✅" if schedule['enabled'] else "❌"
        print(f"  {enabled_icon} {name}")
        print(f"    Type: {schedule['schedule_type']}")
        print(f"    Last Run: {schedule['last_run'] or 'Never'}")
        print(f"    Next Run: {schedule['next_run'] or 'Not scheduled'}")
        print(f"    Max Applications: {schedule['max_applications_per_run']}")
        print()
    
    print("Statistics:")
    stats = status['statistics']
    print(f"  Total Runs: {stats['total_runs']}")
    print(f"  Successful Runs: {stats['successful_runs']}")
    print(f"  Failed Runs: {stats['failed_runs']}")
    print(f"  Applications Cleaned: {stats['applications_cleaned']}")
    print(f"  Folders Removed: {stats['folders_removed']}")
    print(f"  Files Moved: {stats['files_moved']}")
    print(f"  Last Run: {stats['last_run_time'] or 'Never'}")


async def run_consistency_check():
    """Run consistency check"""
    print("🔍 Running consistency check...")
    print()
    
    results = await automated_cleanup_service.run_consistency_check()
    
    print(f"Check Time: {results['check_time']}")
    print(f"Duplicate Applications Found: {results['duplicate_applications_found']}")
    
    if results['duplicate_applications']:
        print("Applications needing cleanup:")
        for app_id in results['duplicate_applications']:
            print(f"  - {app_id}")
    
    print()
    print_verification_results(results['integrity_verification'])
    
    if results['needs_cleanup']:
        print("\n⚠️  Database needs cleanup!")
        if results['alert_threshold_exceeded']:
            print("🚨 Alert threshold exceeded - immediate attention recommended!")
    else:
        print("\n✅ Database consistency check passed!")


def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description="Database Cleanup Script for System Stability Improvements",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/database_cleanup.py --dry-run          # Show what would be cleaned
  python scripts/database_cleanup.py --cleanup          # Perform cleanup (interactive)
  python scripts/database_cleanup.py --cleanup --force  # Perform cleanup (no prompts)
  python scripts/database_cleanup.py --verify           # Verify database integrity
  python scripts/database_cleanup.py --status           # Show service status
  python scripts/database_cleanup.py --check            # Run consistency check
  python scripts/database_cleanup.py --rollback ID      # Rollback a cleanup operation
        """
    )
    
    parser.add_argument(
        '--dry-run', action='store_true',
        help='Show what would be cleaned up without making changes'
    )
    parser.add_argument(
        '--cleanup', action='store_true',
        help='Perform the actual cleanup operation'
    )
    parser.add_argument(
        '--verify', action='store_true',
        help='Verify database integrity'
    )
    parser.add_argument(
        '--rollback', type=str, metavar='ROLLBACK_ID',
        help='Rollback a cleanup operation using the specified rollback ID'
    )
    parser.add_argument(
        '--status', action='store_true',
        help='Show automated cleanup service status'
    )
    parser.add_argument(
        '--check', action='store_true',
        help='Run consistency check'
    )
    parser.add_argument(
        '--force', action='store_true',
        help='Skip confirmation prompts (use with --cleanup)'
    )
    
    args = parser.parse_args()
    
    # Check that at least one action is specified
    actions = [args.dry_run, args.cleanup, args.verify, args.rollback, args.status, args.check]
    if not any(actions):
        parser.print_help()
        return
    
    print_banner()
    
    try:
        if args.dry_run:
            asyncio.run(run_dry_run())
        elif args.cleanup:
            asyncio.run(run_cleanup(force=args.force))
        elif args.verify:
            asyncio.run(run_verification())
        elif args.rollback:
            asyncio.run(run_rollback(args.rollback))
        elif args.status:
            asyncio.run(show_service_status())
        elif args.check:
            asyncio.run(run_consistency_check())
            
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()