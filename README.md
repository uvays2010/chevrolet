# Chevrolet Universe — V9 Admin Fix

An independent Chevrolet-inspired React + Vite demo with a Node.js API. Not an official Chevrolet or General Motors product.

## Admin login fix

The previous setup required two terminals. This package changes `npm run dev` to start **both the API server and the Vite frontend together**, so `/api/auth/admin` is not sent to an unavailable backend during local development.

### Run on Windows, macOS or Linux

1. Install Node.js 18 or newer.
2. Extract this ZIP.
3. Open a terminal in the extracted project folder.
4. Run:

   ```bash
   npm install
   npm run dev
   ```

5. Open the local URL printed by Vite (usually `http://localhost:5173`).
6. Go to `http://localhost:5173/admin-login`.

**Local demo admin password:** `uvays1221`

The included `.env` is for local testing only. Change `ADMIN_PASSWORD` and `SESSION_SECRET` before deploying anywhere public. Do not publish this demo `.env` or reuse its credentials.

### Check the API

Open `http://localhost:4000/api/health`. It should return JSON containing `"ok":true`. Keep the terminal running while using the site. Press `Ctrl+C` to stop both services.

## What the admin backend supports

- Server-verified admin login with an HttpOnly session cookie
- Session check and logout
- Protected vehicle listing, create, edit and delete endpoints
- Protected audit log endpoint
- Protected order listing and order status updates
- JSON-file persistence in `server/data/db.json`

## Troubleshooting

- If `npm install` fails, check your internet connection and Node.js/npm installation.
- If port 4000 is already in use, stop the other process using it, then run `npm run dev` again.
- If `/api/health` does not return `ok:true`, the API did not start; check the terminal error.
- If the website is deployed on static hosting (for example, a static-only Vercel/Netlify site), this local Node API does not automatically deploy with it. Deploy `server/index.mjs` as a Node service and configure the hosting proxy/rewrite for `/api/*` to that service. A static frontend alone cannot perform this login.

## Security and production limitations

This is a local demo starter, not production-ready authentication. Before public deployment use a managed database, strong unique secrets, password hashing and credential rotation, CSRF protection, HTTPS, persistent session storage, backups, monitoring and a security review. JSON-file persistence and in-memory sessions are intended only for local/small demo use.
