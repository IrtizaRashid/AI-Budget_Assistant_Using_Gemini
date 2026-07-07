# API Testing Guide

Base URL: **`http://localhost:5001`**

All request/response bodies are JSON. Protected routes require a Supabase access token:

```
Authorization: Bearer <supabase_access_token>
```

Get a token by signing in via the frontend (OTP flow) and reading it from the browser devtools Network tab, or from `supabase.auth.getSession()` in the console.

---

## 0. Prerequisites

1. **Run the Postgres schema** in Supabase SQL Editor — paste [`database/supabase_schema.sql`](../database/supabase_schema.sql) and execute.

2. **Set env vars** in `backend/.env`:
   ```
   DATABASE_URL=postgresql://postgres.xxxx:password@....pooler.supabase.com:6543/postgres
   SUPABASE_JWT_SECRET=your_supabase_jwt_secret
   CORS_ORIGIN=http://localhost:5173
   ```

3. **Start the backend**:
   ```bash
   cd backend
   npm run dev
   ```
   You should see `🚀 Server running on http://localhost:5001` and `✅ Database connected`.

4. **Sanity check**: `GET http://localhost:5001/api/health` → `{ "status": "Server Running" }`

5. **Sign in** via the frontend at `http://localhost:5173` to obtain a Bearer token.

---

## 1. Current user — `GET /api/auth/me`

**Headers:** `Authorization: Bearer <token>`

**Response `200`**
```json
{
  "id": 1,
  "auth_id": "uuid-from-supabase",
  "name": "Irtiza",
  "email": "you@example.com",
  "monthly_budget": "50000.00",
  "hasGeminiKey": true,
  "created_at": "...",
  "updated_at": "..."
}
```

---

## 2. Budget setup — `POST /api/setup-budget`

**Headers:** `Authorization: Bearer <token>`

**Request body**
```json
{
  "monthlyBudget": 50000,
  "categories": [
    { "category": "Food", "allocatedAmount": 15000, "percentage": 30 },
    { "category": "Transport", "allocatedAmount": 10000, "percentage": 20 },
    { "category": "Savings", "allocatedAmount": 25000, "percentage": 50 }
  ]
}
```

**Response `201`**
```json
{
  "message": "Budget setup completed successfully.",
  "userId": 1
}
```

---

## 3. Update budget allocation — `PUT /api/budget-allocation`

Direct budget edits are logged as `budget_adjustment` rows in `misc_transactions`.

**Headers:** `Authorization: Bearer <token>`

**Request body** — same shape as setup-budget.

**Response `200`**
```json
{
  "message": "Budget allocation updated successfully.",
  "userId": 1
}
```

---

## 4. Save Gemini API key — `PUT /api/users/me/gemini-key`

**Headers:** `Authorization: Bearer <token>`

**Request body**
```json
{
  "apiKey": "AIza..."
}
```

**Response `200`** — updated user profile (without the raw key).

---

## 5. Chat — `POST /api/chat/:userId`

Requires a saved Gemini key. The `:userId` in the URL is ignored — the authenticated user's ID is used.

**Headers:** `Authorization: Bearer <token>`

**Request body**
```json
{
  "message": "I spent 500 on pizza"
}
```

---

## Legacy endpoints (removed)

| Endpoint | Status |
| --- | --- |
| `POST /api/auth/register` | **410** — use Supabase email OTP |
| `POST /api/auth/login` | **410** — use Supabase email OTP |
| `POST /api/users` | Removed — users are auto-created on first authenticated request |

---

## Error codes (Gemini)

| HTTP | `code` | Meaning |
| --- | --- | --- |
| 402 | `GEMINI_KEY_MISSING` | No key saved — frontend opens key modal |
| 402 | `GEMINI_KEY_INVALID` | Key rejected by Google |
| 402 | `GEMINI_QUOTA` | Free-tier quota exhausted |
