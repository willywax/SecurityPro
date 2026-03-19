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

### Database Models Created
1. organizations
2. users
3. roles
4. employees
5. employee_bank_accounts
6. employee_referees
7. employee_next_of_kin
8. employee_contracts
9. employee_documents
10. clients
11. sites
12. assets
13. asset_issuances
14. payrolls
15. payroll_items
16. invoices
17. invoice_items
18. payments
19. payment_allocations
20. refresh_tokens

### API Endpoints
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- GET /api/auth/me
- POST /api/auth/forgot-password
- GET /api/health

## Prioritized Backlog

### P0 - Critical (Next Phase)
- [ ] Employee CRUD operations
- [ ] Client management
- [ ] Site management

### P1 - High Priority
- [ ] Asset tracking & issuance
- [ ] Basic payroll processing
- [ ] Invoice generation

### P2 - Medium Priority
- [ ] Shift scheduling
- [ ] Attendance tracking
- [ ] Document uploads

### P3 - Future Enhancements
- [ ] Reports & analytics
- [ ] Email notifications
- [ ] Mobile app
- [ ] Integrations (payroll systems, accounting)

## Default Credentials
- Email: admin@securityops.com
- Password: Admin123!
- Organization: SecureOps Demo

## Tech Stack
- **Backend**: FastAPI, Motor (async MongoDB), Pydantic, JWT
- **Frontend**: React, TailwindCSS, shadcn/ui, axios
- **Database**: MongoDB
- **Auth**: JWT access + refresh tokens

## Next Tasks
1. Implement Employee CRUD endpoints
2. Add Employee list/detail views in frontend
3. Implement Client management
4. Add Site management with client association
