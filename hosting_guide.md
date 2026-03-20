# Hosting & Database Guide

Hosting NiKii Digital involves setting up the frontend, backend, and database separately. The current production environment is hosted on Render.com with Supabase.

## 1. Hosting Component Architecture
- **Frontend**: Traditional React Static Site.
- **Backend**: Node.js Web Service.
- **Database**: PostgreSQL (Supabase) — *Alternatively MySQL as requested by the user.*

## 2. Setting up the Server with MySQL
If you prefer migrating from Supabase to a locally hosted or managed MySQL database:

### Database Setup
1. Setup a MySQL server (v8.0+).
2. Use the provided migration scripts (SQL) to create the `registrations`, `courses`, `payments`, `attendance`, `materials`, and `settings` tables.
3. Obtain your connection URL: `mysql://user:password@host:port/dbname`.

### Server Configuration
Update the `.env` in the `server` directory:
```properties
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=nikiidigital
DB_PORT=3306
```

### Dependency Changes
In `server/package.json`, ensure `mysql2` is installed:
```bash
npm install mysql2
```

## 3. General Hosting Instructions (Render.com)

### Backend Deployment
1. Connect your GitHub repository to **Render**.
2. Select **Web Service**.
3. Set **Runtime** to Node.
4. Set **Build Command**: `npm run build`
5. Set **Start Command**: `npm start`
6. Configure the Environment Variables from your `.env` file.

### Frontend Deployment
1. Select **Static Site**.
2. Set **Build Command**: `npm run build`
3. Set **Publish Directory**: `dist`
4. Use `_redirects` file for SPA routing (already included in `public/`).

## 4. Third-Party API Setup
- **UltraMsg**: Register at [ultramsg.com](https://ultramsg.com), create an instance, and copy the `Instance ID` and `Token` to your server `.env`.
- **Resend**: Register for an API key at [resend.com](https://resend.com) for official emails.
