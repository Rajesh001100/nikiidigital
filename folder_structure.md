# Project Folder Structure

NiKii Digital is organized as a monorepo containing both the frontend (web) and backend (server) applications.

## Root Directory
- **`web/`**: The React/Vite frontend application.
- **`server/`**: The Node.js/Express backend API.
- **`aboutproject.md`**: Project overview and features.
- **`techstack.md`**: Technical architecture and dependencies.
- **`hosting_guide.md`**: Deployment and database setup instructions.
- **`workflow.md`**: End-to-step-step business logic of the academy.
- **`client_report.md`**: Formal summary for the client.
- **`package.json`**: Root configuration for managing the monorepo workspaces.

---

## 💻 Frontend (`/web`)
The frontend is a modern React application built with Vite and Tailwind CSS.

- **`src/pages/`**: Contains the main views (Home, Student Login, Student Dashboard, Admin, Staff).
- **`src/lib/api.ts`**: API wrapper for communicating with the backend server.
- **`src/types.ts`**: Global TypeScript interfaces for students, courses, and payments.
- **`src/App.tsx`**: Main routing and layout configuration (Global Navigation & Footer).
- **`public/`**: Static assets like the `_redirects` file for routing on Render.com.

---

## ⚙️ Backend (`/server`)
The backend is a TypeScript/Express server that handles database operations and external API integrations.

- **`src/index.ts`**: The core server logic, including all API endpoints and middleware.
- **`src/db.ts`**: Database connection logic (Supabase/PostgreSQL).
- **`.env`**: Private environment variables (API keys, database credentials).
- **`data/`**: Local data storage for backup purposes (if applicable).
- **`dist/`**: Compiled JavaScript files ready for production.

---

## 🛠️ Utility & Debug Scripts (Root)
- **`seed_db.ts`**: Script to populate the database with initial course and setting data.
- **`database_backup.sql`**: A recent export of the database schema and data.
- **`test_ultramsg.js`**: A diagnostic script for testing WhatsApp connectivity.
- **`fix_encoding.js`**: Utility for correcting text encoding issues (e.g., currency symbols).
