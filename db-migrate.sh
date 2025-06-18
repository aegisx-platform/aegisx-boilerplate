#!/bin/bash

# Database Migration Helper Script for Docker Container
# Usage examples:
#   ./db-migrate.sh status    - Check migration status
#   ./db-migrate.sh latest    - Run pending migrations
#   ./db-migrate.sh rollback  - Rollback last migration
#   ./db-migrate.sh seed      - Run seeds

set -e

case "$1" in
  "status")
    echo "🔍 Checking migration status..."
    knex migrate:status --knexfile knexfile.js
    ;;
  "latest")
    echo "🚀 Running pending migrations..."
    knex migrate:latest --knexfile knexfile.js
    echo "✅ Migrations completed!"
    ;;
  "rollback")
    echo "⏪ Rolling back last migration..."
    knex migrate:rollback --knexfile knexfile.js
    echo "✅ Rollback completed!"
    ;;
  "seed")
    echo "🌱 Running database seeds..."
    knex seed:run --knexfile knexfile.js
    echo "✅ Seeds completed!"
    ;;
  "reset")
    echo "🔄 Resetting database (rollback all + migrate + seed)..."
    knex migrate:rollback --all --knexfile knexfile.js
    knex migrate:latest --knexfile knexfile.js
    knex seed:run --knexfile knexfile.js
    echo "✅ Database reset completed!"
    ;;
  *)
    echo "📖 Database Migration Helper"
    echo ""
    echo "Usage: $0 {status|latest|rollback|seed|reset}"
    echo ""
    echo "Commands:"
    echo "  status    - Check current migration status"
    echo "  latest    - Run all pending migrations"
    echo "  rollback  - Rollback the last migration"
    echo "  seed      - Run database seeds"
    echo "  reset     - Full reset (rollback all + migrate + seed)"
    echo ""
    echo "Examples:"
    echo "  # Check what migrations need to run"
    echo "  docker exec -it <container> ./db-migrate.sh status"
    echo ""
    echo "  # Run pending migrations"
    echo "  docker exec -it <container> ./db-migrate.sh latest"
    echo ""
    echo "  # Setup fresh database with test data"
    echo "  docker exec -it <container> ./db-migrate.sh reset"
    exit 1
    ;;
esac
