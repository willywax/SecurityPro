# Security Operations SaaS - PRD

## Original Problem Statement
Build a multi-tenant SaaS monorepo called "Security Operations SaaS" for security guard companies with:
- Backend: FastAPI + MongoDB (adapted from PostgreSQL requirement)
- Frontend: React + TailwindCSS + shadcn/ui
- Auth: JWT with refresh tokens
- Multi-tenant architecture with org_id on all models

## User Personas
1. **Admin** - Full system access, organization management
2. **Manager** - Employee, client, and operational oversight
3. **Supervisor** - Site and guard management
4. **Guard** - Limited access to own schedules and assets
5. **Viewer** - Read-only access to reports

## Core Requirements (Static)
- Multi-tenant data isolation via org_id
- JWT authentication with refresh tokens (30min access / 7 day refresh)
- Organization branding (logo + accent color)
- Responsive design (desktop sidebar / mobile drawer)
- Role-based access control

## What's Been Implemented

### Phase 1 - Auth & DB Schema (March 19, 2026)
- ✅ Full database schema (18 models with multi-tenant support)
- ✅ Login page with split layout (form + image)
- ✅ Forgot password flow
- ✅ JWT authentication (access + refresh tokens)
- ✅ Dashboard with sidebar navigation
- ✅ Organization branding support
- ✅ Mobile responsive drawer navigation
- ✅ Protected routes
- ✅ Database seeding (admin user + demo org)

### Phase 2 - HR Records Module (March 19, 2026)
- ✅ Employee list page with search, filter by status, pagination, colored avatar initials
- ✅ Employee create form with validation
- ✅ Employee detail page with tabbed interface
- ✅ Profile tab - full CRUD with profile photo upload/delete
- ✅ Bank Details tab - full CRUD
- ✅ Referees tab - full CRUD with ID document upload
- ✅ Next of Kin tab - full CRUD with ID document upload
- ✅ Employment History tab - full CRUD
- ✅ Contracts tab - full CRUD, contract_number auto-generated (CTR-YYYY-XXXX)
- ✅ Employee ID (EMP0001) and Guard No (G0001) auto-generated

### Phase 3 - Clients & Sites Module (March 19, 2026)
- ✅ Client list page (/clients) with search + status filter (active/inactive/prospect)
- ✅ Client detail/create/edit page (/clients/new, /clients/:id)
- ✅ Client ID auto-generated (CLT0001, CLT0002...)
- ✅ Site list page (/sites) with search + client filter + status filter
- ✅ Site detail/create/edit page (/sites/new, /sites/:id)
- ✅ Site ID auto-generated (SITE001, SITE002...)
- ✅ Site detail shows parent client name with link
- ✅ All IDs in system are auto-generated

### Auto-Generated ID Formats
- Employee: EMP0001
- Guard No: G0001
- Client: CLT0001
- Site: SITE001
- Contract: CTR-2026-0001

### API Endpoints

**Auth:**
- POST /api/auth/login
- POST /api/auth/refresh
- GET /api/users/me

**Employees:**
- GET/POST /api/employees
- GET/PUT/DELETE /api/employees/:id
- POST/DELETE /api/employees/:id/photo
- GET/POST/PUT/DELETE /api/employees/:id/bank-account
- GET/POST /api/employees/:id/referees
- GET/PUT/DELETE /api/employees/:id/referees/:ref_id
- GET/POST /api/employees/:id/next-of-kin
- GET/POST/PUT/DELETE /api/employees/:id/employment-history
- GET/POST /api/employees/:id/contracts
- GET/PUT/DELETE /api/employees/:id/contracts/:cid

**Clients:**
- GET/POST /api/clients
- GET/PUT/DELETE /api/clients/:id

**Sites:**
- GET/POST /api/sites
- GET/PUT/DELETE /api/sites/:id

## Prioritized Backlog

### P0 - Next Up
- [ ] Employee Documents tab with file uploads (PDF/images)
- [ ] Assets Module (asset list, create, issuance to employees)

### P1 - High Priority
- [ ] Payroll processing module
- [ ] Invoice generation module
- [ ] Payments module

### P2 - Future
- [ ] Shift scheduling
- [ ] Attendance tracking
- [ ] Reports & analytics
- [ ] Email notifications

## Default Credentials
- Email: admin@securityops.com
- Password: Admin123!
- Organization: SecureOps Demo

## Tech Stack
- **Backend**: FastAPI, Motor (async MongoDB), Pydantic, JWT
- **Frontend**: React, TailwindCSS, shadcn/ui, axios
- **Database**: MongoDB
- **Auth**: JWT access + refresh tokens

## Code Architecture
```
/app
├── backend/
│   ├── routers/
│   │   ├── auth.py
│   │   ├── employees.py   # HR + sub-resources
│   │   ├── clients.py     # Module 2
│   │   └── sites.py       # Module 3
│   ├── models/__init__.py  # All 18 Pydantic models
│   ├── utils/auth.py
│   ├── server.py
│   └── seed.py
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Login.js, Dashboard.js
│       │   ├── EmployeeList.js, EmployeeCreate.js, EmployeeDetail.js
│       │   ├── ClientList.js, ClientDetail.js
│       │   └── SiteList.js, SiteDetail.js
│       ├── components/layout/
│       └── context/AuthContext.js
└── memory/PRD.md
```
