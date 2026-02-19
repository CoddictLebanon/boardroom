FROM node:20-bookworm

# Install PostgreSQL and supervisord
RUN apt-get update && apt-get install -y \
    postgresql-15 \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files for both apps
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

# Install dependencies
RUN cd apps/api && npm install
RUN cd apps/web && npm install

# Copy prisma schema and generate client
COPY apps/api/prisma ./apps/api/prisma/
RUN cd apps/api && npx prisma generate

# Copy supervisord config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose ports
EXPOSE 3000 3001 5432

# Start supervisord
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
