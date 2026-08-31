#!/bin/sh
if [ "$SERVICE_ROLE" = "worker" ]; then
  exec node server/worker.js
fi
exec node server/index.js
