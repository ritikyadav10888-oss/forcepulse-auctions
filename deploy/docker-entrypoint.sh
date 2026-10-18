#!/bin/sh
# Container start: prepare /data, update the database tables, then run the app as the unprivileged "node" user.
set -e

mkdir -p /data/uploads /data/backups
chown -R node:node /data

as_node() { setpriv --reuid=node --regid=node --init-groups "$@"; }

as_node npx prisma db push --skip-generate
exec setpriv --reuid=node --regid=node --init-groups node server.js --prod
