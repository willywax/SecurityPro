# SecurityPro Operations Management System

Internal, mobile-friendly OMS for security operations.

## Stack
- Backend: FastAPI + SQLAlchemy 2.0 async + Alembic + Pydantic v2
- DB: PostgreSQL (Supabase/Neon compatible)
- Frontend: React + TypeScript + Vite + Tailwind

## Features implemented
- CRUD: Guards, Clients, Sites, Assets
- Asset issuance/return/lost workflow with one-open-issuance enforcement
- Payroll months (draft/lock), item generation, adjustments, recompute, CSV export
- Invoices: create draft, auto totals, send (queued outbox), void
- Payments with allocations and invoice status recompute
- Client statements as JSON/CSV over date ranges
- JWT login stub with roles: Admin/Ops Manager/Accountant
- Responsive UI with mobile drawer navigation and mobile-safe cards/scroll

## Backend setup
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # optional
alembic upgrade head
python seed.py
uvicorn app.main:app --reload
```

### Backend env vars
- `DATABASE_URL` e.g. `postgresql+asyncpg://user:pass@host/db`
- `JWT_SECRET`
- `CORS_ORIGINS` comma-separated
- Optional SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`

## Frontend setup
```bash
cd frontend
npm install
npm run dev
```
Use `VITE_API_URL=http://localhost:8000` if needed.

## Demo login users
- `admin / password`
- `ops / password`
- `acct / password`

## Notes
- `/invoices/{id}/pdf` currently returns printable text for reliability in all environments.
- Email sending queues to `email_outbox` and can be wired to SMTP worker later.
