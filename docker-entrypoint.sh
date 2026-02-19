#!/bin/bash
set -e

PGDATA=/data/postgresql

# Create log directory
mkdir -p /var/log/supervisor

# Fix PostgreSQL data directory permissions
mkdir -p $PGDATA
chown -R postgres:postgres $PGDATA
chmod 700 $PGDATA

# Initialize PostgreSQL if needed
if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "Initializing PostgreSQL..."
    su - postgres -c "/usr/lib/postgresql/15/bin/initdb -D $PGDATA"

    # Configure PostgreSQL to listen on localhost
    echo "listen_addresses = 'localhost'" >> $PGDATA/postgresql.conf
    echo "port = 5432" >> $PGDATA/postgresql.conf

    # Start PostgreSQL temporarily to create user and database
    su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D $PGDATA -l /tmp/pg.log start"
    sleep 3

    # Create user and database
    su - postgres -c "psql -c \"CREATE USER chairboard WITH PASSWORD 'chairboard';\""
    su - postgres -c "psql -c \"CREATE DATABASE chairboard OWNER chairboard;\""
    su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE chairboard TO chairboard;\""

    # Stop PostgreSQL (supervisord will start it)
    su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D $PGDATA stop"
    sleep 2
fi

# Run Prisma migrations
echo "Running Prisma migrations..."
cd /app/apps/api

# Start PostgreSQL temporarily for migrations
su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D $PGDATA -l /tmp/pg.log start"
sleep 3

DATABASE_URL="postgresql://chairboard:chairboard@localhost:5432/chairboard?schema=public" npx prisma db push --skip-generate || true

su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D $PGDATA stop"
sleep 2

cd /app

# Execute the main command (supervisord)
exec "$@"
