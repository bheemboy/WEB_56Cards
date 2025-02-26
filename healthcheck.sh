#!/bin/sh

# Check NGINX health (assuming /health exists)
if ! curl --silent --fail http://localhost/health; then
  echo "NGINX is down"
  exit 1
fi

# Check the other service on port 8080
if ! curl --silent --fail http://localhost:8080/health; then
  echo "SingalR service on port 8080 is down"
  exit 1
fi

echo "Both services are healthy"
exit 0
