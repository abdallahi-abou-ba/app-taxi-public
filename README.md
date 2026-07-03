# Taxi MVP

Full-stack ride-hailing MVP with two roles (client, driver): an Express/Prisma/PostgreSQL backend and an Expo/React Native mobile app.

- `backend/` - REST API + Socket.IO, PostgreSQL via Prisma, Jest test suite
- `mobile/` - Expo/React Native app (shared codebase for both roles)

## Prerequisites

- Node.js >= 20
- Docker (for local PostgreSQL)
- A physical phone with the **Expo Go** app (SDK 54 - the mobile app is pinned to that SDK, so Expo Go must match), or an Android/iOS simulator

## Backend setup

1. Start PostgreSQL in Docker:

   ```bash
   docker run --name taxi-postgres -e POSTGRES_PASSWORD=taxi_dev_password -p 5433:5432 -d postgres:16-alpine
   ```

   Exposed on port **5433** (not 5432) so it doesn't clash with a natively-installed Postgres service.

2. Create the dev and test databases:

   ```bash
   docker exec -it taxi-postgres psql -U postgres -c "CREATE DATABASE taxi_mvp;"
   docker exec -it taxi-postgres psql -U postgres -c "CREATE DATABASE taxi_mvp_test;"
   ```

3. Install dependencies and configure environment:

   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```

   Edit `.env` - at minimum set:

   ```
   DATABASE_URL=postgresql://postgres:taxi_dev_password@127.0.0.1:5433/taxi_mvp
   DIRECT_URL=postgresql://postgres:taxi_dev_password@127.0.0.1:5433/taxi_mvp
   JWT_SECRET=<a long random string>
   ```

4. Apply migrations and start the dev server:

   ```bash
   npx prisma migrate deploy
   npm run dev
   ```

   The API listens on `http://0.0.0.0:3000`.

### Tests

Tests run against the separate `taxi_mvp_test` database created above.

```bash
cp .env.example .env.test
# edit .env.test: NODE_ENV=test and point DATABASE_URL/DIRECT_URL at taxi_mvp_test
DATABASE_URL=postgresql://postgres:taxi_dev_password@127.0.0.1:5433/taxi_mvp_test \
DIRECT_URL=postgresql://postgres:taxi_dev_password@127.0.0.1:5433/taxi_mvp_test \
npx prisma migrate deploy   # apply the schema to the test DB once

npm test
```

### Sending a promo push notification

```bash
npm run promo -- "Title" "Body" [CLIENT|DRIVER]
```

Broadcasts to every user with a registered push token (optionally filtered by role).

## Mobile setup (Expo)

1. Install dependencies:

   ```bash
   cd mobile
   npm install
   ```

2. Point the app at your backend:

   ```bash
   cp .env.example .env
   ```

   Edit `EXPO_PUBLIC_API_URL` in `.env` to match how you're running it (see comments in the file):
   - Physical phone via Expo Go, same Wi-Fi as this machine: your machine's LAN IP, e.g. `http://192.168.1.23:3000`
   - Android emulator: `http://10.0.2.2:3000`
   - iOS simulator / web: `http://localhost:3000`

3. Start Metro:

   ```bash
   npx expo start --lan
   ```

   Scan the QR code with Expo Go, or press `a` / `i` for an emulator/simulator.

Make sure the phone and the machine running the backend are on the same Wi-Fi network, and that your firewall allows inbound connections on ports `3000` (backend) and `8081` (Metro).
