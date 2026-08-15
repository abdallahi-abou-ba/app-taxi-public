@echo off
docker inspect taxi-postgres >nul 2>&1
if %errorlevel%==0 (
    docker start taxi-postgres
) else (
    docker run -d --name taxi-postgres -e POSTGRES_PASSWORD=taxi_dev_password -e POSTGRES_DB=taxi_mvp -p 5433:5432 -v taxi-postgres-data:/var/lib/postgresql/data postgres:16-alpine
)
ping -n 4 127.0.0.1 >nul
npm run dev
