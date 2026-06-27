# API Testing Guide — Step 2 (Database Layer)

Base URL: **`http://localhost:5001`**

All request/response bodies are JSON. In Postman set:
**Headers → `Content-Type: application/json`**, and put bodies under **Body → raw → JSON**.

---

## 0. Prerequisites

1. **Create the database & tables** (run once):
   ```bash
   mysql -u root -p < ../database/schema.sql
   ```
   (or paste `database/schema.sql` into MySQL Workbench / phpMyAdmin and run it)

2. **Set DB credentials** in `backend/.env`:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=budget_ai
   ```

3. **Start the backend**:
   ```bash
   cd backend
   npm run dev
   ```
   You should see `🚀 Server running on http://localhost:5001` and `✅ MySQL connected`.

4. **Sanity check**: `GET http://localhost:5001/api/health` → `{ "status": "Server Running" }`

---

## 1. Create a user — `POST /api/users`

**Request body**
```json
{
  "name": "Irtiza",
  "monthly_budget": 50000
}
```

**Response `201`**
```json
{
  "id": 1,
  "name": "Irtiza",
  "monthly_budget": "50000.00",
  "created_at": "2026-06-28T10:00:00.000Z"
}
```

**curl**
```bash
curl -X POST http://localhost:5001/api/users \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Irtiza\",\"monthly_budget\":50000}"
```

> Note the returned `id` — you'll use it (`1`) in the requests below.

---

## 2. Save budget categories — `POST /api/categories`

Body is an **array**.

**Request body**
```json
[
  { "user_id": 1, "category_name": "Food",      "allocated_amount": 15000, "spent_amount": 0 },
  { "user_id": 1, "category_name": "Transport", "allocated_amount": 7500,  "spent_amount": 0 }
]
```

**Response `201`**
```json
{ "message": "Categories saved", "inserted": 2 }
```

**curl**
```bash
curl -X POST http://localhost:5001/api/categories \
  -H "Content-Type: application/json" \
  -d "[{\"user_id\":1,\"category_name\":\"Food\",\"allocated_amount\":15000,\"spent_amount\":0},{\"user_id\":1,\"category_name\":\"Transport\",\"allocated_amount\":7500,\"spent_amount\":0}]"
```

---

## 3. Add an expense — `POST /api/expenses`

**Request body**
```json
{
  "user_id": 1,
  "category": "Food",
  "amount": 500,
  "description": "Pizza"
}
```

**Response `201`**
```json
{
  "id": 1,
  "user_id": 1,
  "category": "Food",
  "amount": "500.00",
  "description": "Pizza",
  "expense_date": "2026-06-28T10:05:00.000Z"
}
```

**curl**
```bash
curl -X POST http://localhost:5001/api/expenses \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":1,\"category\":\"Food\",\"amount\":500,\"description\":\"Pizza\"}"
```

---

## 4. Dashboard summary — `GET /api/dashboard/:userId`

**Request**: `GET http://localhost:5001/api/dashboard/1`

**Response `200`**
```json
{
  "monthlyBudget": 50000,
  "totalSpent": 500,
  "remainingBudget": 49500
}
```

`remainingBudget` is **calculated** (`monthlyBudget − SUM(expenses)`), never stored.

**curl**
```bash
curl http://localhost:5001/api/dashboard/1
```

---

## 5. Categories with remaining — `GET /api/categories/:userId`

**Request**: `GET http://localhost:5001/api/categories/1`

**Response `200`**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "category_name": "Food",
    "allocated_amount": 15000,
    "spent_amount": 0,
    "remaining_amount": 15000
  },
  {
    "id": 2,
    "user_id": 1,
    "category_name": "Transport",
    "allocated_amount": 7500,
    "spent_amount": 0,
    "remaining_amount": 7500
  }
]
```

`remaining_amount` is **calculated** (`allocated − spent`), never stored.

**curl**
```bash
curl http://localhost:5001/api/categories/1
```

---

## 6. All expenses (latest first) — `GET /api/expenses/:userId`

**Request**: `GET http://localhost:5001/api/expenses/1`

**Response `200`** — sorted by `expense_date DESC`:
```json
[
  {
    "id": 1,
    "user_id": 1,
    "category": "Food",
    "amount": "500.00",
    "description": "Pizza",
    "expense_date": "2026-06-28T10:05:00.000Z"
  }
]
```

**curl**
```bash
curl http://localhost:5001/api/expenses/1
```

---

## Suggested test sequence (end-to-end)

1. `POST /api/users` → note the `id`
2. `POST /api/categories` (array) for that user
3. `POST /api/expenses` once or twice
4. `GET /api/dashboard/:id` → confirm `remainingBudget = monthlyBudget − totalSpent`
5. `GET /api/categories/:id` → confirm each `remaining_amount = allocated − spent`
6. `GET /api/expenses/:id` → confirm newest expense is first

## Error responses to expect

| Situation | Status | Body |
| --- | --- | --- |
| Missing `name`/`monthly_budget` | `400` | `{ "error": "name and monthly_budget are required" }` |
| Categories body not an array | `400` | `{ "error": "Request body must be a non-empty array of categories" }` |
| Expense `amount` ≤ 0 | `400` | `{ "error": "amount must be a positive number" }` |
| Dashboard for unknown user | `404` | `{ "error": "User not found" }` |
| Unknown route | `404` | `{ "error": "Route not found: ..." }` |

---

### Design note: `spent_amount` vs. expenses
Per the spec, these are **two independent things**:
- `budget_categories.spent_amount` is a **stored** value set when you `POST /api/categories`. The `GET /api/categories/:userId` endpoint uses it for `remaining = allocated − spent`.
- The dashboard's `totalSpent` is the **live SUM of the `expenses` table**.

Adding an expense does **not** auto-update a category's `spent_amount` (the spec did not ask for it). That linkage is an easy future enhancement when you want categories to reflect live spending.
