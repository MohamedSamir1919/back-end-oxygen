# Oxygen API

Express API with MongoDB persistence for staff accounts and JWT-based role checks.

## Run

1. Copy `.env.example` to `.env`, set a unique `JWT_SECRET` of at least 32 characters, set the MongoDB URI, and choose staff usernames and strong passwords.
2. Install dependencies with `npm install`.
3. Create the configured admin/driver accounts with `npm run seed`.
4. Start the API with `npm run dev`.

The seed command creates only missing accounts and never resets an existing password. There is no public staff-registration endpoint.

## Routes

- `POST /api/auth/login` verifies the username and password and returns a signed token plus the account role.
- `GET /api/auth/me` validates a bearer token and returns the current staff identity.
- `GET /api/admin` requires the `admin` role.
- `POST /api/admin/staff` creates an admin or driver account; requires an admin bearer token.
- `GET /api/driver` requires the `driver` role.
- `GET /api/health` reports API availability.

Set `VITE_API_URL` in the frontend environment if the API is not available at `http://localhost:5000/api`.