# Security Operations SaaS

A multi-tenant SaaS platform for security guard companies to manage operations, employees, clients, assets, payroll, and invoicing.

## Tech Stack

- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React + TailwindCSS + shadcn/ui
- **Authentication**: JWT with refresh tokens

## Features (Phase 1 - Auth)

- User authentication with email/password
- JWT access tokens (30 min expiry) + refresh tokens (7 days)
- Multi-tenant architecture (org_id on all models)
- Organization branding (logo + accent color)
- Responsive design with mobile drawer navigation

## Database Models

All models are created with multi-tenant support:

- `organizations` - Company/tenant information
- `users` - System users with roles
- `roles` - Custom role definitions
- `employees` - Guard/staff records
- `employee_bank_accounts` - Banking details
- `employee_referees` - Employment references
- `employee_next_of_kin` - Emergency contacts
- `employee_contracts` - Employment contracts
- `employee_documents` - ID cards, certificates
- `clients` - Customer companies
- `sites` - Guarded locations
- `assets` - Equipment (uniforms, radios, etc.)
- `asset_issuances` - Equipment assignments
- `payrolls` - Pay period records
- `payroll_items` - Individual pay items
- `invoices` - Client billing
- `invoice_items` - Line items
- `payments` - Payment records
- `payment_allocations` - Payment to invoice mapping
- `refresh_tokens` - Auth token storage

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- MongoDB (local or cloud)

### Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set environment variables (copy .env.example to .env)
# MONGO_URL=mongodb://localhost:27017
# DB_NAME=security_ops
# JWT_SECRET_KEY=your-secret-key

# Run the server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
yarn install

# Set environment variables
# REACT_APP_BACKEND_URL=http://localhost:8001

# Run the development server
yarn start
```

### Default Credentials

After starting the backend, the database will be automatically seeded:

- **Email**: admin@securityops.com
- **Password**: Admin123!
- **Organization**: SecureOps Demo

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout (revoke tokens) |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/forgot-password` | Request password reset |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/` | API root |
| GET | `/api/health` | Health check |

## Environment Variables

### Backend (.env)

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=security_ops
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production
CORS_ORIGINS=*
```

### Frontend (.env)

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

## Project Structure

```
/app
├── backend/
│   ├── models/           # Pydantic models
│   ├── routers/          # API routes
│   ├── utils/            # Auth utilities
│   ├── server.py         # FastAPI application
│   ├── seed.py           # Database seeder
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # UI components
│   │   │   ├── layout/   # Sidebar, Header, Layout
│   │   │   └── ui/       # shadcn components
│   │   ├── context/      # React context (Auth)
│   │   ├── pages/        # Page components
│   │   └── lib/          # Utilities
│   └── package.json
└── README.md
```

## Design System

- **Primary Color**: #0F172A (Slate 900)
- **Font**: Inter
- **Status Colors**:
  - Success: #10B981 (Emerald)
  - Warning: #F59E0B (Amber)
  - Danger: #EF4444 (Red)
  - Info: #3B82F6 (Blue)

## Next Steps (Future Phases)

1. Employee management (CRUD)
2. Client & Site management
3. Asset tracking
4. Payroll processing
5. Invoicing
6. Reports & Analytics

## License

Proprietary - All rights reserved.
