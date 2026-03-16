# NikiiDigital Course Registration

A simple course registration website for **NikiiDigital**:

- Browse available courses
- Register online
- View registrations (admin)

## Prerequisites

- Node.js 20+ (recommended)

## Setup

```bash
npm install
```

## Run (dev)

Starts **backend** on `http://localhost:5174` and **frontend** on `http://localhost:5173`.

```bash
npm run dev
```

## Admin (view registrations)

Registrations are available at:

- `http://localhost:5173/admin`

Default admin key (dev only): `nikiidigital-admin`

## Data storage

The backend stores data in a local SQLite file in `server/data/app.db`.

