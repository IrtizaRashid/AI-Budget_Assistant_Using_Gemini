# 💸 AI Personal Budget Assistant

A full-stack web app to set up a monthly budget, track expenses, and **manage everything with natural language** (typed or spoken). Say *"I spent 500 on pizza"* and the AI categorises it, the backend saves it, and the dashboard + charts update in real time.

---

## 📋 Description

After a one-time budget setup, you get a dark, modern dashboard with summary cards, charts, and a searchable expense history. An integrated AI assistant (powered by **Groq**) understands plain-English commands to add, view, and delete expenses — while **all calculations and database operations are performed by the backend**, never the AI.

---

## ✨ Features

- **Budget setup** with recommended, editable category allocations.
- **Dashboard** — summary cards, allocation/spending pie charts, allocated-vs-spent-vs-remaining bar chart.
- **AI chat** (type or 🎤 speak) to add / view / delete expenses and check budgets.
- **Voice input & spoken replies** via the Web Speech API.
- **Searchable expense history** with delete + confirmation.
- **Smart workflows** — insufficient-budget handling (transfer / over-budget / cancel), duplicate detection, budget warnings, and AI financial recommendations.
- **Real-time refresh** — everything updates after each change, no page reload.

---

## 🛠 Technology Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Frontend  | React (Vite), React Router, Tailwind CSS, Chart.js |
| HTTP      | Axios                                    |
| Backend   | Node.js, Express.js                      |
| Database  | MySQL (mysql2)                           |
| AI        | Groq (`groq-sdk`)                        |

**Deployment:** Frontend → **Vercel**, Backend → **Render**, Database → **Railway MySQL**.

---

## 📁 Folder Structure

```
budget-ai/
├── README.md · .gitignore
│
├── database/
│   ├── schema.sql            # Tables, indexes, foreign keys
│   └── seed.sql              # Optional sample data
│
├── backend/
│   ├── server.js             # App entry: CORS, JSON, routes
│   ├── .env.example
│   ├── config/env.js         # All env-driven config
│   ├── database/db.js        # MySQL connection pool
│   ├── middleware/           # asyncHandler, errorHandler
│   ├── routes/ controllers/ services/   # API layers
│   └── utils/                # budget-warning calculator
│
└── frontend/
    ├── .env.example
    ├── index.html · vite.config.js · tailwind.config.js
    └── src/
        ├── pages/            # BudgetSetup, Dashboard
        ├── components/       # cards, tables, chat, charts, voice
        ├── services/         # Axios API helpers (VITE_API_URL)
        └── utils/            # formatting helpers
```

---

## ⚙️ Installation

**Prerequisites:** Node.js 18+, MySQL 8+, and a free [Groq](https://console.groq.com) API key.

```bash
git clone https://github.com/IrtizaRashid/AI-Personal-Budget-Assistant.git
cd AI-Personal-Budget-Assistant

# Database (local)
mysql -u root -p -e "CREATE DATABASE budget_ai;"
mysql -u root -p budget_ai < database/schema.sql
# optional sample data:
# mysql -u root -p budget_ai < database/seed.sql

# Backend
cd backend && npm install && cp .env.example .env   # edit values

# Frontend
cd ../frontend && npm install && cp .env.example .env   # set VITE_API_URL=http://localhost:5001
```

---

## 🔐 Environment Variables

**Backend (`backend/.env`)**

| Variable        | Description                                  | Example |
| --------------- | -------------------------------------------- | ------- |
| `PORT`          | Server port                                  | `5001` |
| `NODE_ENV`      | `development` or `production`                | `production` |
| `CORS_ORIGIN`   | Allowed frontend origin(s), comma-separated  | `https://your-app.vercel.app` |
| `DB_HOST`       | MySQL host                                   | `localhost` |
| `DB_PORT`       | MySQL port                                   | `3306` |
| `DB_USER`       | MySQL user                                   | `root` |
| `DB_PASSWORD`   | MySQL password                               | `secret` |
| `DB_NAME`       | Database name                                | `budget_ai` |
| `GROQ_API_KEY`  | Groq API key (**backend only**)              | `gsk_...` |
| `GROQ_MODEL`    | Groq model                                   | `llama-3.3-70b-versatile` |

**Frontend (`frontend/.env`)**

| Variable        | Description                       | Example |
| --------------- | -------------------------------- | ------- |
| `VITE_API_URL`  | Backend base URL (no trailing /) | `https://your-backend.onrender.com` |

---

## ▶️ Running Locally

```bash
# Terminal 1 — backend (http://localhost:5001)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

Open **http://localhost:5173**. (Voice input needs Chrome/Edge + microphone permission.)

---

## 🚀 Deployment

### 1. Database — Railway MySQL
1. Create a project at [railway.app](https://railway.app) → **New → Database → MySQL**.
2. Open the MySQL service → **Variables** tab to find `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`.
3. Load the schema: open the service's **Data/Query** tab and paste `database/schema.sql` (and optionally `seed.sql`), **or** run locally:
   ```bash
   mysql -h <MYSQLHOST> -P <MYSQLPORT> -u <MYSQLUSER> -p<MYSQLPASSWORD> <MYSQLDATABASE> < database/schema.sql
   ```

### 2. Backend — Render
1. [render.com](https://render.com) → **New → Web Service** → connect the repo.
2. **Root Directory:** `backend`
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. **Environment Variables** (from Railway + Groq):
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | `https://your-app.vercel.app` |
   | `DB_HOST` | Railway `MYSQLHOST` |
   | `DB_PORT` | Railway `MYSQLPORT` |
   | `DB_USER` | Railway `MYSQLUSER` |
   | `DB_PASSWORD` | Railway `MYSQLPASSWORD` |
   | `DB_NAME` | Railway `MYSQLDATABASE` |
   | `GROQ_API_KEY` | your Groq key |
   | `GROQ_MODEL` | `llama-3.3-70b-versatile` |

   *(Render sets `PORT` automatically — the app reads it.)*
6. Deploy, then note the URL, e.g. `https://your-backend.onrender.com`.

### 3. Frontend — Vercel
1. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
2. **Root Directory:** `frontend`
3. **Framework Preset:** Vite (auto). **Build Command:** `npm run build`. **Output Directory:** `dist`.
4. **Environment Variable:** `VITE_API_URL = https://your-backend.onrender.com`
5. Deploy. Then set Render's `CORS_ORIGIN` to your Vercel URL and redeploy the backend.

---

## 🧯 Troubleshooting

| Symptom | Fix |
| --- | --- |
| **CORS error** in browser console | Set Render `CORS_ORIGIN` to the exact Vercel URL (no trailing slash) and redeploy. |
| Frontend calls `localhost` in prod | `VITE_API_URL` wasn't set at **build** time on Vercel — set it and redeploy. |
| `⚠️ MySQL not connected` | Check `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` match Railway's variables. |
| AI replies fail | Verify `GROQ_API_KEY` on Render and that you have Groq quota. |
| 404 on API routes | Confirm `VITE_API_URL` has **no** trailing slash and no `/api` suffix (the client adds `/api`). |

---

## 📄 License

MIT — for educational/demonstration use.
