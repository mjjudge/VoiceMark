#!/bin/bash
# VoiceMark Backup Script
# Syncs working directory to SSD backup location
# Keeps 7 days of daily snapshots as per AGENTS.md

set -e

# Configuration
SOURCE_DIR="/home/marcus-judge/myapps/VoiceMark"
BACKUP_BASE="/mnt/ssd/backups/voicemark"
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H%M)
SNAPSHOT_NAME="${DATE}_${TIME}"
KEEP_DAYS=7

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[BACKUP]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if backup destination exists
if [ ! -d "/mnt/ssd/backups" ]; then
    error "Backup destination /mnt/ssd/backups does not exist"
fi

# Create backup directory structure
mkdir -p "$BACKUP_BASE/snapshots"
mkdir -p "$BACKUP_BASE/latest"

log "Starting VoiceMark backup..."
log "Source: $SOURCE_DIR"
log "Destination: $BACKUP_BASE"

# Sync to latest (mirror)
log "Syncing to latest..."
rsync -av --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '.vite' \
    --exclude 'target' \
    "$SOURCE_DIR/" "$BACKUP_BASE/latest/"

# Create dated snapshot using hard links (space efficient)
SNAPSHOT_DIR="$BACKUP_BASE/snapshots/$SNAPSHOT_NAME"
if [ -d "$SNAPSHOT_DIR" ]; then
    warn "Snapshot $SNAPSHOT_NAME already exists, updating..."
    rm -rf "$SNAPSHOT_DIR"
fi

log "Creating snapshot: $SNAPSHOT_NAME"
cp -al "$BACKUP_BASE/latest" "$SNAPSHOT_DIR"

# Clean up old snapshots (keep KEEP_DAYS days)
log "Cleaning up snapshots older than $KEEP_DAYS days..."
find "$BACKUP_BASE/snapshots" -maxdepth 1 -type d -mtime +$KEEP_DAYS -exec rm -rf {} \; 2>/dev/null || true

# Count remaining snapshots
SNAPSHOT_COUNT=$(ls -1 "$BACKUP_BASE/snapshots" 2>/dev/null | wc -l)

log "Backup complete!"
log "Snapshots available: $SNAPSHOT_COUNT"
log "Latest snapshot: $SNAPSHOT_NAME"

# Show disk usage
du -sh "$BACKUP_BASE/latest" | awk '{print "Latest size: " $1}'
du -sh "$BACKUP_BASE/snapshots" | awk '{print "Total snapshots size: " $1}'
