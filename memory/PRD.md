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

### Phase 4 - Assets Module (March 19, 2026)
- ✅ Asset list page (/assets) with type filter + status filter + search
- ✅ Asset detail/create/edit page (/assets/:id) with Details + Issuance History tabs
- ✅ Asset ID auto-generated (ASSET0001, ASSET0002...)
- ✅ Issue asset to employee or site via dialog
- ✅ Return asset action with return condition + lost flag
- ✅ Asset status auto-updates: available → issued → available/lost

### Phase 6 - Invoices Module (March 19, 2026)
- ✅ Invoice list page (/invoices) — flat list with filters (client, status, month)
- ✅ Invoice create page (/invoices/new) — select client → sites auto-load → guard/asset line items → live TZS grand total → save
- ✅ Invoice detail page (/invoices/:id) — grouped layout by site, site subtotals, grand total, bank details card
- ✅ Status transitions: Draft → Sent → Paid / Overdue
- ✅ Edit mode with pre-populated items (full replace of sites+items on save)
- ✅ Delete (draft only) with cascade delete of sites+items
- ✅ Print/Download via window.open() — clean A4 HTML layout with company/client/bank info
- ✅ Invoice ID auto-generated (INV0001, INV0002...)
- ✅ Bank details stored on org (CRDB Bank Tanzania default) and displayed on invoice
- ✅ Currency: TZS throughout
- ✅ GET /api/organization endpoint returns full org + bank_details

### Phase 5 - Payroll Module (March 19, 2026)
- ✅ Payroll list page (/payroll) — flat list with filters (month, employee, status), clear filters button
- ✅ Payroll create page (/payroll/new) — tab-based with Single Entry + Bulk Entry modes
- ✅ Single Entry: select employee, month, salary fields (base/allowances/overtime/deductions), net pay auto-preview
- ✅ Bulk Entry: pick month → auto-loads all active employees, remove rows (X), net pay per row, submit all
- ✅ Payroll detail page (/payroll/:id) — view, edit, approve (draft→approved), mark as paid (approved→paid), delete (draft only)
- ✅ Payroll ID auto-generated (PAY0001, PAY0002...)
- ✅ Net pay auto-calculated: base + allowances + overtime - deductions
- ✅ Bulk create endpoint with duplicate detection and skip reporting

### Auto-Generated ID Formats
- Employee: EMP0001
- Guard No: G0001
- Client: CLT0001
- Site: SITE001
- Contract: CTR-2026-0001

- Asset: ASSET0001
- Payroll: PAY0001
- Invoice: INV0001

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

**Assets:**
- GET/POST /api/assets
- GET/PUT/DELETE /api/assets/:id
- GET /api/assets/:id/issuances
- POST /api/assets/:id/issue
- PUT /api/assets/:id/issuances/:iid/return

**Payroll:**
- GET/POST /api/payroll
- POST /api/payroll/bulk
- GET/PUT/DELETE /api/payroll/:id

**Invoices:**
- GET/POST /api/invoices
- GET/PUT/DELETE /api/invoices/:id
- PUT /api/invoices/:id/status
- GET /api/organization

## Prioritized Backlog

### P0 - Next Up
- [ ] Payments module (record payments against invoices)
- [ ] Reports/Analytics dashboard

### P1 - High Priority
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
