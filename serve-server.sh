#!/bin/bash
echo "Running server in docker container with emulators with continuous build enabled..."
docker compose run --rm --service-ports demo-api-server npx nx serve demo-api
