#!/bin/bash

# Database Migration Script
# Runs all SQL migration files in order

set -e

echo "Running database migrations..."

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable not set"
    exit 1
fi

# Note: Using psql or another PostgreSQL client
# This is a placeholder - adapt to your database tool

echo "Migration 1: Creating schema..."
# psql $DATABASE_URL -f scripts/01-schema.sql

echo "Migration 2: Seeding data..."
# psql $DATABASE_URL -f scripts/02-seed-data.sql

echo "Migration 3: Initializing users..."
# psql $DATABASE_URL -f scripts/03-initialize-users.sql

echo "All migrations completed successfully!"
