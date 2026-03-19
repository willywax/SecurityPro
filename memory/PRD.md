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
- ✅ Employee list page with search, filter by status, pagination
- ✅ Mobile card layout for employee list
- ✅ Employee create form with validation
- ✅ Employee detail page with tab shell
- ✅ Profile tab - full CRUD functionality
- ✅ Profile photo upload/delete
- ✅ Other tabs show "Coming soon" placeholder:
  - Bank Details
  - Referees
  - Next of Kin
  - Contracts
  - Assets Issued
  - Documents

### Employee Profile Fields
- employee_id, guard_no, profile_photo
- first_name, middle_name, last_name
- gender, date_of_birth, marital_status
- nationality, NIN
- phone_1, phone_2, email
- physical_address, postal_address
- education_background, job_title
- employment_status, hire_date, termination_date
- notes

### API Endpoints (New)
- GET /api/employees - List with pagination, search, filter
- POST /api/employees - Create employee (auto-generates IDs)
- GET /api/employees/:id - Get single employee
- PUT /api/employees/:id - Update employee
- DELETE /api/employees/:id - Delete employee
- POST /api/employees/:id/photo - Upload photo
- DELETE /api/employees/:id/photo - Delete photo
- **Bank Account:**
  - GET/POST/PUT/DELETE /api/employees/:id/bank-account
- **Referees:**
  - GET /api/employees/:id/referees - List all
  - POST /api/employees/:id/referees - Create
  - GET/PUT/DELETE /api/employees/:id/referees/:ref_id
  - POST/DELETE /api/employees/:id/referees/:ref_id/id-document
- **Next of Kin:**
  - GET/POST/PUT/DELETE /api/employees/:id/next-of-kin
  - POST/DELETE /api/employees/:id/next-of-kin/id-document

## Prioritized Backlog

### P0 - Critical (Next Phase)
- [ ] Contracts tab implementation
- [ ] Documents tab with file uploads
- [ ] Client management

### P1 - High Priority
- [ ] Site management
- [ ] Asset tracking & issuance
- [ ] Assets Issued tab on employee profile

### P2 - Medium Priority
- [ ] Shift scheduling
- [ ] Attendance tracking
- [ ] Basic payroll processing
- [ ] Invoice generation

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
1. Implement Bank Details tab CRUD
2. Implement Referees tab CRUD
3. Implement Next of Kin tab CRUD
4. Add Client management module
