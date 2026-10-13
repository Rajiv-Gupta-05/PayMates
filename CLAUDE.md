# PayMates — Project Context

> Splitwise-inspired expense splitting app. Users track shared expenses with friends and groups, record debt settlements, and view balance summaries.

---

## Tech Stack

| Layer      | Technology                                              |
|------------|---------------------------------------------------------|
| Frontend   | Angular 21 (standalone components, SSR), Bootstrap 5, SCSS |
| Backend    | Node.js + Express 5, MongoDB via Mongoose 9             |
| Auth       | JWT (`jsonwebtoken`) + `bcryptjs` password hashing      |
| Dev Tools  | Nodemon, Angular CLI 21, Prettier, Vitest               |

---

## Project Structure

```
PayMates/
├── CLAUDE.md                  ← You are here
├── backend/                   # Express REST API — runs on port 5001
│   ├── server.js              # Entry point
│   ├── .env                   # PORT, MONGO_URI, JWT_SECRET
│   ├── config/db.js           # MongoDB connection (connectDB)
│   ├── models/                # Mongoose schemas
│   │   ├── User.js
│   │   ├── Group.js
│   │   ├── Expense.js
│   │   └── Settlement.js
│   ├── controllers/           # Business logic
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── groupController.js
│   │   ├── expenseController.js
│   │   ├── settlementController.js
│   │   └── dashboardController.js
│   ├── routes/                # Express route definitions
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── groupRoutes.js
│   │   ├── expenseRoutes.js
│   │   ├── settlementRoutes.js
│   │   └── dashboardRoutes.js
│   └── middlewares/
│       └── authMiddleware.js  # JWT verification guard
│
└── frontend/                  # Angular 21 app — runs on port 4200
    └── src/app/
        ├── app.routes.ts      # Route definitions
        ├── core/
        │   └── services/
        │       └── auth.service.ts   # HTTP calls + JWT localStorage mgmt
        ├── features/
        │   ├── auth/          # login/, register/ components
        │   ├── dashboard/     # Aggregated balance view
        │   ├── groups/        # Group CRUD
        │   ├── friends/       # Friends management
        │   └── activity/      # Expense/settlement history
        └── shared/
            └── components/
                ├── layout/        # Authenticated shell (nav + sidebar)
                └── add-expense/   # Reusable expense creation modal
```

---

## Running the Project

```bash
# Backend (port 5001)
cd backend && npm run dev

# Frontend (port 4200)
cd frontend && npm start
```

---

## API Surface

| Route Prefix          | Resource             |
|-----------------------|----------------------|
| `POST /api/auth/...`      | Register / Login     |
| `/api/users/...`          | Profile & Friends    |
| `/api/groups/...`         | Group CRUD           |
| `/api/expenses/...`       | Expense CRUD         |
| `/api/settlements/...`    | Settlement records   |
| `/api/dashboard/...`      | Balance summaries    |

CORS is locked to `http://localhost:4200`.

---

## Data Models (Summary)

### User
- `name`, `email` (unique, lowercase), `password` (bcrypt hashed)
- `default_currency`: `"INR"` (default)
- `friends: [ObjectId → User]`

### Group
- `name`, `type`: `TRIP | HOME | COUPLE | OTHER`
- `createdBy`, `members: [ObjectId → User]`

### Expense
- `description`, `totalAmount`
- `groupId` (null = direct friend expense, not group-level)
- `createdBy: ObjectId → User`
- `splits: [{ user, amountPaid, amountOwed }]`

### Settlement
- `payer`, `payee: ObjectId → User`
- `amount`
- `groupId` (optional — null = friend-level settlement)

---

## Design System (Frontend)

- **Theme**: Dark mode — base bg `#0B0F19`
- **Accent colors**: Teal `#00ffcc`, Blue `#007bff`, Purple (radial glow)
- **UI pattern**: Glassmorphism cards (`.glass-card`)
- **Buttons**: Gradient `.btn-gradient` (teal → blue)
- **Font**: Inter (Google Fonts)
- **CSS framework**: Bootstrap 5 (customized for dark theme in `styles.scss`)

---

## Auth Flow

1. User registers/logs in → backend returns a JWT
2. Frontend stores token in `localStorage` under key `splitwise_token`
3. `AuthService.getToken()` retrieves the token for authenticated API calls
4. `authMiddleware.js` on the backend verifies the JWT on protected routes

---

## Known Gaps / Watch-outs

- **Route Guards**: Angular route-level `canActivate` guards are **not yet wired up**. Protected pages (`/dashboard`, `/groups`, etc.) may be accessible without a valid token.
- **SSR + localStorage**: `AuthService` uses `localStorage` directly. Since Angular SSR is enabled, wrap with `isPlatformBrowser()` to avoid server-side crashes.
- **Currency**: `default_currency` field exists on `User` but expense/settlement logic may not fully respect it yet — currently treated as `INR`.
- **Error handling**: Validate that all controllers return consistent error shapes for frontend consumption.
