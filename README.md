# TurfReserve — Sports Turf Booking Marketplace

A production-ready MERN stack marketplace for real-time sports turf bookings with commission-based financial logic, atomic transactions, and Razorpay payments.

---

## Quick Start (Development)

### Prerequisites
- Node.js ≥ 18
- MongoDB running locally on port 27017

### 1. Backend
```bash
cd backend
cp .env.example .env        # fill in secrets
npm install
node server.js              # API → http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev                 # UI → http://localhost:5173
```

> **Windows note:** If your project path contains `&`, use the helper scripts at the repo root:
> ```
> .\start-backend.bat
> .\start-frontend.bat
> ```

---

## Architecture

```
Book&Play/
├── backend/                 # Node.js + Express + MongoDB
│   ├── config/              # DB connection (retry logic)
│   ├── models/              # Mongoose schemas (User, Turf, Booking)
│   ├── validators/          # Zod schemas (dual-layer validation)
│   ├── controllers/         # Route handlers (auth, turf, booking)
│   ├── routes/              # Express routers
│   ├── middlewares/         # Auth, RBAC, error handler, rate limiter
│   ├── jobs/                # node-cron: release expired bookings every 10 min
│   ├── utils/               # AppError, cache (Redis/in-memory), logger, mailer
│   ├── swagger/             # OpenAPI 3.0 spec → /api/docs
│   └── server.js            # Entry point
└── frontend/                # Vite + React 19 + TypeScript + Tailwind CSS v4
    └── src/
        ├── components/      # Layout (Navbar, RootLayout, ProtectedRoute)
        │   └── booking/     # SlotPicker (WCAG 2.1 compliant)
        ├── pages/           # Home, Explore, Nearby, TurfDetail, Booking,
        │                    # MyBookings, Profile, Auth, Dashboard, NewTurf
        ├── store/           # Zustand: authStore, bookingStore
        └── lib/             # Axios API client (withCredentials)
```

---

## Key Features

### Backend
| Feature | Detail |
|---|---|
| Auth | JWT in HTTP-only cookies; `Player` / `Owner` / `Admin` RBAC |
| Atomic Booking | MongoDB Session + Transaction prevents double-booking |
| Razorpay | Order creation + HMAC webhook signature verification |
| Expired Slots | node-cron releases `Pending` bookings after 10 minutes |
| Geo-Search | `$near` on GeoJSON 2dsphere index for nearby turfs |
| Caching | Redis (auto-upgrade) or in-memory Map with 10-min TTL |
| SEO | Dynamic `/sitemap.xml` + `/robots.txt` |
| Docs | Swagger UI at `/api/docs` (dev only) |

### Frontend
| Feature | Detail |
|---|---|
| SlotPicker | Optimistic UI — slot shows "Pending" instantly before API resolves |
| ARIA | role=grid, gridcell, row; aria-pressed, aria-label on all slots |
| Date Range | 14-day forward picker; past dates disabled |
| Weekend Pricing | Automatically detects weekends and shows premium price |
| Revenue Chart | CSS bar chart showing monthly earnings (owner dashboard) |
| Nearby | Browser Geolocation API → radius filter (2/5/10/20 km) |

---

## Environment Variables

### Backend — `backend/.env`
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/turfReserve
JWT_SECRET=your_32_char_secret
JWT_EXPIRES_IN=7d
COOKIE_SECRET=another_secret
CLIENT_URL=http://localhost:5173
RAZORPAY_KEY_ID=         # optional (demo mode if blank)
RAZORPAY_KEY_SECRET=     # optional
RAZORPAY_WEBHOOK_SECRET= # optional
REDIS_URL=               # optional (falls back to in-memory)
```

### Frontend — `frontend/.env`
```env
VITE_API_URL=http://localhost:5000
```

---

## Docker Compose (Full Stack)

```bash
cp .env.example .env        # fill JWT_SECRET, COOKIE_SECRET
docker compose up --build
```

Services: MongoDB · Redis · Backend (`:5000`) · Frontend (`:80`)

---

## API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register (Player or Owner) |
| POST | `/api/auth/login` | — | Login → sets JWT cookie |
| POST | `/api/auth/logout` | ✓ | Clear cookie |
| GET | `/api/auth/me` | ✓ | Current user |
| GET | `/api/turfs` | — | List turfs (city/sport filter, paginated) |
| GET | `/api/turfs/nearby` | — | Geo-search (`lat`, `lng`, `radius`) |
| GET | `/api/turfs/:slug` | — | Turf detail |
| GET | `/api/turfs/:slug/slots` | — | Available slots for a date |
| POST | `/api/turfs` | Owner | Create turf |
| PUT | `/api/turfs/:id` | Owner | Update own turf |
| DELETE | `/api/turfs/:id` | Owner | Soft-delete turf |
| POST | `/api/bookings` | Player | Atomic book + Razorpay order |
| GET | `/api/bookings/my` | Player | My bookings |
| GET | `/api/bookings/turf/:id` | Owner | Bookings for my turf |
| PATCH | `/api/bookings/:id/cancel` | Player | Cancel booking |
| GET | `/api/bookings/revenue` | Owner | Revenue dashboard data |
| POST | `/api/bookings/webhook/razorpay` | — | Razorpay HMAC webhook |

Full Swagger spec: `http://localhost:5000/api/docs`

---

## Tech Stack

**Backend:** Node.js · Express · MongoDB + Mongoose · Zod · JWT · Razorpay · node-cron · Winston · Redis (optional) · Swagger/OpenAPI  
**Frontend:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Zustand · Axios · react-hook-form · date-fns · lucide-react · react-helmet-async

---

## Seed Database

```bash
cd backend
node scripts/seed.js
```

Creates 2 users (Player + Owner) and 3 turfs. Runs 24 schema validation tests.
