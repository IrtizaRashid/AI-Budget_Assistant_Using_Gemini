# 💸 AI Personal Budget Assistant

A full-stack web app to set up a monthly budget, track expenses, and **manage everything with natural language** (typed or spoken). Say *"I spent 500 on pizza"* and the AI categorises it, the backend saves it, and the dashboard + charts update in real time.

---

## 📋 Description

After a one-time budget setup, you get a dark, modern dashboard with summary cards, charts, and a searchable expense history. An integrated AI assistant (powered by **Google Gemini**, default `gemini-3-flash-preview`) understands plain-English commands to add, view, and delete expenses — while **all calculations and database operations are performed by the backend**, never the AI.

Sign in with **email OTP** — no passwords. Each user provides their own Gemini API key in the app.

---

## ✨ Features

- **Email OTP login** via Supabase Auth (6-digit code, no passwords).
- **Per-user Gemini API keys** — each user brings their own free key from Google AI Studio.
- **Budget setup** with recommended, editable category allocations.
- **Dashboard** — summary cards, allocation/spending pie charts, allocated-vs-spent-vs-remaining bar chart.
- **AI chat** (type or 🎤 speak) to add / view / delete expenses and check budgets.
- **Voice input & spoken replies** via the Web Speech API.
- **Searchable transaction history** with budget transfers and budget adjustment audit log.
- **Smart workflows** — insufficient-budget handling (transfer / over-budget / cancel), duplicate detection, budget warnings, and AI financial recommendations.
- **Real-time refresh** — everything updates after each change, no page reload.

---

## 🛠 Technology Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Frontend  | React (Vite), React Router, Tailwind CSS, Chart.js |
| Auth      | Supabase Auth (email OTP)               |
| HTTP      | Axios                                    |
| Backend   | Node.js, Express.js (Vercel serverless) |
| Database  | Supabase Postgres (`pg`)                |
| AI        | Google Gemini (`gemini-3-flash-preview`) |

**Deployment:** Frontend → **Vercel**, Backend → **Vercel** (serverless), Database + Auth → **Supabase**.

---

## 📁 Folder Structure

```
budget-ai/
├── README.md · .gitignore
│
├── database/
│   └── supabase_schema.sql   # Postgres schema (run in Supabase SQL Editor)
│
├── backend/
│   ├── server.js             # Express app (exported for Vercel)
│   ├── api/index.js          # Vercel serverless entry
│   ├── vercel.json
│   ├── .env.example
│   ├── config/env.js
│   ├── database/db.js        # Postgres pool (pg)
│   ├── middleware/           # auth, asyncHandler, errorHandler
│   ├── routes/ controllers/ services/
│   └── utils/
│
└── frontend/
    ├── vercel.json
    ├── .env.example
    └── src/
        ├── pages/            # Login, Dashboard, Settings, …
        ├── components/       # cards, charts, chat, ApiKeyModal
        ├── context/          # AuthContext (Supabase session)
        ├── services/         # api.js, supabase.js
        └── utils/
```

---

## ⚙️ Installation

**Prerequisites:** Node.js 18+, a [Supabase](https://supabase.com) project, and a free [Gemini API key](https://aistudio.google.com/apikey) (saved per-user in the app).

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com) → **New project**.
2. **Settings → API** — copy **Project URL** and **anon public** key.
3. **Settings → API → JWT Settings** — copy **JWT Secret**.
4. **Connect → Transaction pooler** — copy the URI (must use port **6543**); replace `[YOUR-PASSWORD]` with your database password.
5. **Authentication → Emails → Magic Link** — add to the email body:
   ```
   Your Budget AI login code is: {{ .Token }}
   ```
6. **SQL Editor** — paste and run [`database/supabase_schema.sql`](database/supabase_schema.sql).

### 2. Clone and install

```bash
git clone https://github.com/IrtizaRashid/AI-Personal-Budget-Assistant.git
cd AI-Personal-Budget-Assistant

cd backend && npm install && cp .env.example .env
cd ../frontend && npm install && cp .env.example .env
```

---

## 🔐 Environment Variables

**Backend (`backend/.env`)**

| Variable | Description | Example |
| --- | --- | --- |
| `PORT` | Local dev port | `5001` |
| `NODE_ENV` | `development` or `production` | `development` |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated | `http://localhost:5173` |
| `DATABASE_URL` | Supabase Transaction pooler URI (port 6543) | `postgresql://postgres.xxxx:...@....pooler.supabase.com:6543/postgres` |
| `SUPABASE_JWT_SECRET` | JWT Secret from Supabase API settings | `your-jwt-secret` |
| `GEMINI_API_KEY` | Optional fallback for local testing only | *(empty — users set their own)* |
| `GEMINI_MODEL` | Gemini model | `gemini-3-flash-preview` |

**Frontend (`frontend/.env`)**

| Variable | Description | Example |
| --- | --- | --- |
| `VITE_API_URL` | Backend base URL (no trailing `/`) | `http://localhost:5001` |
| `VITE_SUPABASE_URL` | Supabase Project URL | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key | `eyJ...` |

---

## ▶️ Running Locally

```bash
# Terminal 1 — backend (http://localhost:5001)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

Open **http://localhost:5173**, sign in with your email OTP, paste your Gemini key when prompted, then complete budget setup.

(Voice input needs Chrome/Edge + microphone permission.)

---

## 🚀 Deployment (Vercel + Supabase)

Deploy as **two separate Vercel projects** from the same repo.

### 1. Backend — Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
2. **Root Directory:** `backend`
3. **Framework Preset:** Other
4. **Environment Variables:**

   | Key | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Supabase Transaction pooler URI (port 6543) |
   | `SUPABASE_JWT_SECRET` | Supabase JWT Secret |
   | `CORS_ORIGIN` | Your frontend Vercel URL (no trailing slash) |
   | `GEMINI_MODEL` | `gemini-3-flash-preview` |

5. Deploy and note the URL, e.g. `https://budget-ai-api.vercel.app`.

### 2. Frontend — Vercel

1. **Add New → Project** (same repo).
2. **Root Directory:** `frontend`
3. **Framework Preset:** Vite
4. **Environment Variables:**

   | Key | Value |
   | --- | --- |
   | `VITE_API_URL` | Backend Vercel URL from step 1 |
   | `VITE_SUPABASE_URL` | Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

5. Deploy and note the URL, e.g. `https://budget-ai.vercel.app`.

### 3. Supabase Auth URLs

In Supabase → **Authentication → URL Configuration**:

- **Site URL:** your frontend Vercel URL
- **Redirect URLs:** add your frontend URL (and `http://localhost:5173` for local dev)

Redeploy the backend if you change `CORS_ORIGIN`.

---

## 🧯 Troubleshooting

| Symptom | Fix |
| --- | --- |
| **CORS error** in browser | Set backend `CORS_ORIGIN` to the exact frontend URL (no trailing slash) and redeploy. |
| Frontend calls `localhost` in prod | `VITE_API_URL` must be set at **build** time on Vercel — redeploy after setting it. |
| `Database connection failed` | Check `DATABASE_URL` uses the **Transaction pooler** on port **6543** and the password is correct. |
| OTP email not received | Supabase free tier limits outbound email (~few/hour). Check spam; for heavy use, add custom SMTP (e.g. Resend). |
| OTP email has no code | Edit the Magic Link template to include `{{ .Token }}`. |
| `401 Unauthorized` on API calls | Sign in again; ensure `SUPABASE_JWT_SECRET` matches Supabase JWT Settings. |
| AI replies fail / key modal | Save a valid Gemini key from [Google AI Studio](https://aistudio.google.com/apikey). |
| 404 on API routes | `VITE_API_URL` should have **no** trailing slash and **no** `/api` suffix. |

---

## 📄 License

MIT — for educational/demonstration use.
