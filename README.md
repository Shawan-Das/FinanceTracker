# Balqen — Personal Finance Tracker

A comprehensive web-based application for tracking personal finances, managing accounts, monitoring loans, and understanding your financial position at any point in time.

**Project Name:** Balqen  
**Tagline:** Track your money, people, and loans

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Production Deployment](#production-deployment)
- [Database](#database)
- [Environment Configuration](#environment-configuration)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Overview

**Balqen** is a personal financial ledger application that helps you maintain a complete and understandable record of your personal financial activity. Unlike banking systems, Balqen records transactions you enter and calculates balances and outstanding amounts from those records.

### What Problems Does It Solve?

- Track money across multiple accounts (bank, cash, digital wallets)
- Monitor loans and lending relationships
- Track money owed to and owed by other people
- View complete transaction history
- Generate financial reports and insights
- Understand your financial position at any date

---

## Features

### 💰 Account Management
- Create and manage multiple accounts (bank accounts, cash, e-wallets, etc.)
- Track balances in real-time
- View account-specific transaction history
- Account types for better organization

### 📊 Transaction Tracking
- Record income and expenses
- Transfer money between your own accounts
- Track lending and borrowing with people
- Money received from and lent to individuals
- Loan-related transactions
- Rich transaction metadata (date, amount, person, category, description)

### 👥 People Management
- Maintain a list of people with financial relationships
- Track exact amounts owed to each person
- Track exact amounts they owe you
- Complete transaction history with each person
- Quick balance view per person

### 💳 Loan Management
- Create and manage loans
- Track loan balances
- Monitor repayment schedules
- Calculate interest and outstanding amounts
- View loan-specific transaction history

### 📈 Reports & Dashboard
- Real-time financial dashboard with key metrics
- Total money across all accounts
- Account-wise breakdown
- Total receivable/payable at a glance
- Recent transaction feed
- Financial reports and summaries
- Transaction history with filtering by date, account, person, category
- Charts and visualizations

### 🔐 User Authentication
- Secure user registration and login
- Email verification
- Password reset functionality
- Session management
- JWT-based authentication

### 🎨 User Experience
- Light and dark mode support
- Responsive design (mobile, tablet, desktop)
- Modern UI with Tailwind CSS
- Real-time data updates
- Loading states and error handling
- Empty states and helpful guidance

---

## How It Works: Real-World Examples

### Example 1: Tracking Money Lent to Friends 👥

**Scenario:** You lent $500 to your friend Sarah for a trip, $300 to your colleague Mike for lunch, and $200 to your roommate Tom.

**Without Balqen:**
- Spreadsheet or notes app tracking (error-prone)
- Can't remember exact amounts or dates
- Awkward conversations: "Did you pay me back yet?"
- Manual calculations to track who owes what
- Risk of forgetting to collect money

**With Balqen:**
```
1. Add "Sarah" to your People list
2. Record transaction: "Lend $500 to Sarah" on date
3. Record transaction: "Receive $250 from Sarah" (partial repayment)
4. Dashboard shows: Sarah still owes you $250
5. When Sarah pays back completely: Record $250 payment → Balqen updates automatically

Result: Instant clarity. No awkward conversations. Complete history. Automated balance tracking.
Time saved: 2-3 minutes per transaction vs. 10+ minutes manual tracking
```

---

### Example 2: Managing Multiple Accounts 💳

**Scenario:** You have:
- Main bank account ($5,000)
- Savings account ($15,000)
- Work expense account ($1,200)
- Cash in wallet ($150)

**Without Balqen:**
- Log into 4 different banking apps
- Manually add up all accounts
- Can't see transfers between accounts clearly
- Hard to know true net worth
- Forget about cash balance

**With Balqen:**
```
Dashboard instantly shows:
├── Main Bank: $5,000
├── Savings: $15,000
├── Work Expense: $1,200
└── Cash Wallet: $150
───────────────────
Total: $21,350

Features:
- Transfer $100 from Main → Savings with one click
- Track which account each expense came from
- See which account has the most activity
- Filter transactions by account

Result: Complete financial picture in seconds. See relationships between accounts.
Time saved: 5-10 minutes checking multiple apps reduced to 10 seconds
```

---

### Example 3: Loan Management & Debt Tracking 💰

**Scenario:** You have:
- Car loan: $15,000 remaining
- Personal loan from family: $5,000
- Student loan: $25,000

**Without Balqen:**
- Different loan statements from different sources
- Hard to calculate total debt
- Don't know which payments are due
- Can't predict when loans will be paid off
- Manual interest calculations

**With Balqen:**
```
1. Add loans to Loan Management section
2. Input: Loan amount, interest rate, monthly payment, due dates
3. System automatically:
   - Calculates remaining balance
   - Shows next payment date
   - Tracks payment history
   - Calculates total payable with interest

Balqen Dashboard shows:
├── Car Loan
│   ├── Remaining: $14,200
│   ├── Next Payment: $450 due Sept 15
│   └── Payoff Date: Dec 2027
├── Personal Loan
│   ├── Remaining: $5,000
│   ├── Next Payment: $500 due Sept 30
│   └── Payoff Date: Oct 2026
└── Student Loan
    ├── Remaining: $24,900
    ├── Next Payment: $300 due Sept 10
    └── Payoff Date: Aug 2032

Total Monthly Debt Payments: $1,250
Total Remaining Debt: $44,100

Result: Instant debt overview. Never miss a payment. Clear path to debt freedom.
Time saved: 30+ minutes researching loan statements → 30 seconds in Balqen
```

---

### Example 4: Expense Tracking & Categorization 📊

**Scenario:** You want to understand where your money goes each month.

**Without Balqen:**
- Credit card statement review (confusing merchant names)
- Manual categorization (Food, Transport, Entertainment, etc.)
- Spreadsheet formulas for totals
- Can't easily compare months
- Guess-based budgeting

**With Balqen:**
```
You record transactions throughout the month:
- $45 at Starbucks → Category: Coffee (or Food)
- $120 at Shell Gas → Category: Transport
- $280 grocery shopping → Category: Groceries
- $50 Netflix → Category: Entertainment
- $200 dentist → Category: Health

Balqen auto-suggests categories based on merchant + history

Monthly Reports show:
├── Food & Groceries: $325 (28%)
├── Transport: $240 (20%)
├── Entertainment: $150 (13%)
├── Utilities: $180 (15%)
├── Health: $200 (17%)
└── Other: $120 (10%)

Bonus Features:
- Compare this month vs. last month
- See spending trends over 6 months
- Identify unusual spending patterns
- Export report as PDF/CSV
- Set category budgets (future feature)

Result: Know exactly where money goes. Identify savings opportunities. Make informed decisions.
Insight gained: Found you spend 28% on food - can you reduce to 20%? Saves $80/month = $960/year
```

---

### Example 5: Shared Expenses with Roommates 🏠

**Scenario:** You live with 2 roommates. Monthly expenses:
- Rent: $2,400 (split 3 ways = $800 each)
- Internet: $60 (split 3 ways = $20 each)
- Utilities: $150 (split 3 ways = $50 each)
- Common groceries: $180 (varies by usage)

**Without Balqen:**
- "Who paid what?" confusion
- Manual splitting calculations error-prone
- Trust issues ("Did you calculate that right?")
- Phone notes and texts get lost
- Arguments about who owes whom
- Awkward payment reminders

**With Balqen:**
```
1. Add "Roommate 1 (Alex)" and "Roommate 2 (Jordan)" to People
2. Each transaction recorded with splits:
   
   Transaction: "Rent Payment" - $2,400
   → Your share: $800 (paid)
   → Alex owes: $800
   → Jordan owes: $800
   
   Transaction: "Groceries" - $180
   → You paid: $180
   → Alex owes: $60
   → Jordan owes: $120

3. Person View for each roommate shows:
   
   Alex:
   ├── Rent: You paid $800, Alex owes $800
   ├── Internet: You paid $20, Alex owes $20
   ├── Utilities: You paid $50, Alex owes $50
   └── Groceries: You paid $45, Alex owes $45
   
   TOTAL: Alex owes you $960 (or shows if Alex paid extra, you owe them)

Result: Crystal clear who owes what. No arguments. Transaction history proof.
Efficiency: Eliminates hours of spreadsheet management. Everyone stays happy.
```

---

### Example 6: Household Budget Analysis 📈

**Scenario:** You want to understand if you're living within your means over 6 months.

**Without Balqen:**
- Download 6 months of statements manually
- Copy into spreadsheet
- Create pivot tables (time-consuming)
- Make charts (requires skill)
- Update monthly (repetitive)

**With Balqen:**
```
You set up the system once, Balqen does the rest:

1. All transactions recorded automatically as they happen
2. Dashboard automatically calculates:
   
   6-Month Summary:
   ├── Total Income: $24,000 ($4,000/month avg)
   ├── Total Expenses: $18,500 ($3,083/month avg)
   ├── Total Loans: $1,500/month repayment
   ├── Money to Savings: $4,000 total
   
3. Dashboard shows:
   - Income vs. Expenses over time (chart)
   - Expense breakdown by category (pie chart)
   - Trends (am I spending more/less than last month?)
   - Forecasts (if this continues, I'll save $X by year end)

4. Reports can be:
   - Exported as PDF (share with accountant/financial advisor)
   - Generated monthly automatically
   - Used for tax preparation

Result: Instant financial insights. See patterns and trends. Make data-driven decisions.
Efficiency: 3-4 hours manual analysis → 30 seconds automated analysis every month
```

---

### Why Balqen is Efficient 🚀

| Task | Traditional Way | With Balqen | Time Saved |
|------|-----------------|-------------|-----------|
| Track money lent | Notes app + manual tracking | Automated balance tracking | 80% |
| Check net worth | Log in 4 apps, add manually | One dashboard view | 85% |
| Manage loans | Multiple statements + spreadsheet | Centralized dashboard | 70% |
| Expense analysis | Spreadsheet + manual categorization | Auto-categorized reports | 75% |
| Split expenses | Calculator + notes + manual tracking | Automatic person-wise tracking | 90% |
| Financial reports | Hours of spreadsheet work | One-click PDF export | 95% |

---

### Key Efficiency Benefits

✅ **Centralized:** One place for all financial data (no app-hopping)  
✅ **Automated:** Categories, calculations, balances update instantly  
✅ **Real-time:** Always know current balances and who owes what  
✅ **Accurate:** Decimal precision prevents rounding errors  
✅ **Searchable:** Find any transaction in seconds with filters  
✅ **Shareable:** Generate reports to share with accountants or advisors  
✅ **Stress-free:** Never forget money lent or owed  
✅ **Insight-driven:** Charts and reports reveal spending patterns  

---

## Tech Stack

### Frontend
- **React 18** — UI library with modern hooks
- **TypeScript** — Type-safe development
- **Vite** — Fast build tool and dev server
- **React Router** — Client-side navigation
- **TanStack Query** — Server state management
- **Tailwind CSS** — Utility-first CSS framework
- **Recharts** — Data visualization and charts
- **Axios** — HTTP client
- **Lucide React** — Icon library
- **React Hot Toast** — Notifications

### Backend
- **Node.js 18+** — JavaScript runtime
- **Express** — REST API framework
- **TypeScript** — Type-safe backend
- **PostgreSQL** — Relational database
- **Zod** — Schema validation
- **Bcrypt** — Password hashing
- **JWT** — Authentication tokens
- **Nodemailer** — Email service
- **Express Rate Limit** — API rate limiting
- **Helmet** — Security headers

### Database
- **PostgreSQL** — Primary data storage
- Supports Neon, Supabase, Railway, or self-hosted
- DECIMAL/NUMERIC types for monetary values (no floating-point)

### DevOps & Deployment
- **Vercel** — Recommended hosting platform
- **Docker** — Container support
- **Make** — Build automation

---

## Project Structure

```
FinanceTracker/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/              # Reusable React components
│   │   │   ├── Layout.tsx           # Main layout wrapper
│   │   │   ├── Modal.tsx            # Modal component
│   │   │   ├── LoadingSpinner.tsx   # Loading indicator
│   │   │   ├── EmptyState.tsx       # Empty state UI
│   │   │   └── ...
│   │   ├── pages/                   # Page-level components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── TransactionsPage.tsx
│   │   │   ├── AccountsPage.tsx
│   │   │   ├── PeoplePage.tsx
│   │   │   ├── LoansPage.tsx
│   │   │   └── ...
│   │   ├── contexts/                # React context providers
│   │   │   ├── AuthContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   ├── utils/                   # Utility functions
│   │   │   ├── format.ts
│   │   │   └── smartSuggestions.ts
│   │   ├── types/                   # TypeScript types
│   │   ├── api/                     # API client
│   │   │   └── client.ts
│   │   ├── App.tsx                  # Main app component
│   │   ├── main.tsx                 # Entry point
│   │   └── index.css                # Global styles
│   ├── public/                      # Static files
│   ├── package.json
│   ├── vite.config.ts               # Vite configuration
│   ├── tailwind.config.js           # Tailwind CSS config
│   ├── tsconfig.json
│   └── index.html
│
├── server/                          # Express backend
│   ├── src/
│   │   ├── app.ts                   # Express app setup
│   │   ├── routes/                  # API route handlers
│   │   │   ├── auth.ts
│   │   │   ├── accounts.ts
│   │   │   ├── transactions.ts
│   │   │   ├── people.ts
│   │   │   ├── loans.ts
│   │   │   ├── categories.ts
│   │   │   ├── dashboard.ts
│   │   │   └── reports.ts
│   │   ├── middleware/              # Express middleware
│   │   │   ├── auth.ts
│   │   │   ├── rateLimit.ts
│   │   │   └── validation.ts
│   │   ├── services/                # Business logic services
│   │   │   ├── email.ts
│   │   │   ├── lockout.ts
│   │   │   └── voucher.ts
│   │   ├── database/                # Database setup & queries
│   │   │   ├── connection.ts
│   │   │   ├── setup.ts
│   │   │   ├── seed.ts
│   │   │   ├── reset.ts
│   │   │   └── check.ts
│   │   ├── shared/                  # Shared utilities
│   │   │   ├── financial.ts
│   │   │   ├── id.ts
│   │   │   └── token.ts
│   │   ├── types/                   # TypeScript types
│   │   └── __tests__/               # Test files
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── dist/                        # Compiled output
│
├── DatabaseDesign/
│   └── database.sql                 # Database schema
│
├── package.json                     # Root workspace
├── Makefile                         # Build commands
├── DEPLOYMENT.md                    # Deployment guide
├── README.md                        # This file
└── personal-finance-tracker-requirements.md # Requirements specification
```

---

## Getting Started

### Prerequisites

- **Node.js 18.x or higher** (check with `node --version`)
- **npm 9.x or higher** (comes with Node.js)
- **PostgreSQL 12+** (Neon, Supabase, Railway, or self-hosted)
- **Git** (for cloning the repository)

### Quick Start (Development)

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd FinanceTracker
```

#### 2. Install Dependencies
```bash
make install
```

This installs dependencies for the root workspace, server, and client.

#### 3. Set Up Environment Variables

Create a `.env` file in the `FinanceTracker/server` directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/finance_tracker

# Server
PORT=3001
NODE_ENV=development

# Frontend
FRONTEND_URL=http://localhost:5173

# Email (optional, codes logged to console if not set)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# JWT
JWT_SECRET=your-super-secret-key-change-this-in-production

# Application
APP_URL=http://localhost:3001
```

#### 4. Set Up the Database

```bash
make db-create    # Creates the database
make db-migrate   # Runs migrations (if applicable)
make db-seed      # Populates with sample data
```

#### 5. Start Development Servers

```bash
make dev
```

This starts both the frontend (Vite on `http://localhost:5173`) and backend (Express on `http://localhost:3001`) in development mode with hot reload.

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001/api

#### 6. Open in Browser

Navigate to http://localhost:5173 and log in with test credentials:
- **Email:** test@example.com
- **Password:** TestPassword123! (or check seeded data)

---

## Development

### Running Individual Services

```bash
# Run only the frontend
make dev-client

# Run only the backend
make dev-server
```

### Building for Production

```bash
make build
```

Outputs:
- Frontend: `FinanceTracker/client/dist/`
- Backend: `FinanceTracker/server/dist/`

### Running Production Build Locally

```bash
# Build first
make build

# Start production server
make start
# Server runs on http://localhost:3001
```

### Testing

```bash
# Run all tests
make test

# Watch mode (auto-rerun on changes)
cd FinanceTracker/server && npm run test:watch
```

### Code Quality

Frontend uses TypeScript for type safety. Backend includes validation with Zod.

### Development Workflow

1. **Frontend changes**: Edit files in `client/src/` — changes auto-reload in browser
2. **Backend changes**: Edit files in `server/src/` — server auto-restarts with tsx
3. **Database changes**: Modify `server/src/database/setup.ts` and run `make db-reset`
4. **API testing**: Use Postman, curl, or your favorite API client

---

## Production Deployment

### Option 1: Vercel (Recommended) ⭐

Vercel is the easiest way to deploy. The entire application (React frontend + Express API) runs from one URL.

#### Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Select your repository
4. **Configure:**
   - **Root Directory:** `FinanceTracker`
   - **Framework:** Other
   - **Build Command:** `npm run vercel-build`
   - **Output Directory:** `public`
5. **Add Environment Variables:** (See [Environment Configuration](#environment-configuration))
6. Click **Deploy**

#### Step 3: Set Up Database
- Use Neon, Supabase, or Railway for PostgreSQL
- Add `DATABASE_URL` to Vercel environment variables
- Run migrations on your deployed instance

Your app will be live at: `https://your-project.vercel.app`

#### Step 4: Custom Domain (Optional)
- Go to project settings → Domains
- Add your custom domain
- Update DNS records as shown by Vercel

### Option 2: Self-Hosted Server

Deploy on any server with Node.js and PostgreSQL support.

#### Prerequisites
- Server with Node.js 18+
- PostgreSQL database
- Nginx or another reverse proxy (optional)
- SSL certificate (recommended)

#### Deployment Steps

```bash
# 1. SSH into server
ssh user@your-server.com

# 2. Clone repository
git clone <repository-url>
cd FinanceTracker

# 3. Install dependencies
make install

# 4. Set up environment variables
nano FinanceTracker/server/.env
# Add all environment variables (see below)

# 5. Set up database
DATABASE_URL="..." make db-create

# 6. Build for production
make build

# 7. Use PM2 or systemd to keep app running
npm install -g pm2
pm2 start FinanceTracker/server/dist/app.js --name "finance-tracker"
pm2 startup
pm2 save
```

#### Nginx Configuration Example
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then enable HTTPS with Let's Encrypt:
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Database

### Database Design

The database uses a ledger-based model to accurately track all financial transactions.

**Key Tables:**
- `users` — User accounts with authentication
- `accounts` — Bank accounts, wallets, etc.
- `transactions` — All financial transactions
- `people` — Individuals with financial relationships
- `loans` — Loan records and details
- `categories` — Transaction categories

### Monetary Values

All monetary amounts are stored using **DECIMAL/NUMERIC** types with appropriate precision (not floating-point) to ensure accuracy and prevent rounding errors.

### Database Setup

```bash
# Create database
make db-create

# Reset database (clears all data, runs migrations)
make db-reset

# Seed with sample data
make db-seed
```

### Database Migrations

Edit `FinanceTracker/server/src/database/setup.ts` to add new tables or modify schema. The database setup runs on app initialization.

### Database Backups

For production, set up automated backups:
- **Vercel + Neon:** Neon handles automatic backups
- **Vercel + Supabase:** Supabase handles automatic backups
- **Self-hosted:** Use `pg_dump` regularly:
  ```bash
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
  ```

---

## Environment Configuration

### Server Environment Variables

Create `FinanceTracker/server/.env`:

```env
# =============================================================================
# Database
# =============================================================================
DATABASE_URL=postgresql://user:password@localhost:5432/finance_tracker

# =============================================================================
# Server
# =============================================================================
PORT=3001
NODE_ENV=development|production

# =============================================================================
# Frontend
# =============================================================================
FRONTEND_URL=http://localhost:5173  # Development
# or
FRONTEND_URL=https://yourdomain.com # Production

# =============================================================================
# CORS
# =============================================================================
CORS_ORIGIN=http://localhost:5173

# =============================================================================
# Authentication
# =============================================================================
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRY=7d

# =============================================================================
# Email (Optional - codes logged to console if not configured)
# =============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com

# =============================================================================
# Application
# =============================================================================
APP_URL=http://localhost:3001  # Development
# or
APP_URL=https://yourdomain.com  # Production

# =============================================================================
# Features (optional)
# =============================================================================
ENABLE_RATE_LIMIT=true
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

### Email Configuration

For Gmail:
1. Enable 2-factor authentication
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
3. Use the app password in `SMTP_PASSWORD`

For other providers:
- **SendGrid:** Use SendGrid API
- **Mailgun:** Configure Mailgun credentials
- **AWS SES:** Configure AWS credentials

If no email service is configured, verification codes are logged to the server console.

---

## API Endpoints

The backend provides RESTful API endpoints for all financial operations.

### Authentication Endpoints
```
POST   /api/auth/register          # Create new account
POST   /api/auth/login             # Login with email/password
POST   /api/auth/logout            # Logout
POST   /api/auth/forgot-password   # Request password reset
POST   /api/auth/reset-password    # Reset password with token
GET    /api/auth/me                # Get current user
```

### Account Endpoints
```
GET    /api/accounts               # List user's accounts
POST   /api/accounts               # Create new account
GET    /api/accounts/:id           # Get account details
PUT    /api/accounts/:id           # Update account
DELETE /api/accounts/:id           # Delete account
```

### Transaction Endpoints
```
GET    /api/transactions           # List transactions with filters
POST   /api/transactions           # Create new transaction
GET    /api/transactions/:id       # Get transaction details
PUT    /api/transactions/:id       # Update transaction
DELETE /api/transactions/:id       # Delete transaction
```

### People Endpoints
```
GET    /api/people                 # List people
POST   /api/people                 # Add new person
GET    /api/people/:id             # Get person details
PUT    /api/people/:id             # Update person
DELETE /api/people/:id             # Delete person
GET    /api/people/:id/balance     # Get money owed/receivable
```

### Loan Endpoints
```
GET    /api/loans                  # List loans
POST   /api/loans                  # Create new loan
GET    /api/loans/:id              # Get loan details
PUT    /api/loans/:id              # Update loan
DELETE /api/loans/:id              # Delete loan
```

### Category Endpoints
```
GET    /api/categories             # List transaction categories
POST   /api/categories             # Create new category
PUT    /api/categories/:id         # Update category
DELETE /api/categories/:id         # Delete category
```

### Dashboard & Reports Endpoints
```
GET    /api/dashboard              # Dashboard metrics and summaries
GET    /api/reports                # Financial reports
GET    /api/reports/by-date        # Reports filtered by date
GET    /api/reports/by-category    # Reports filtered by category
```

### All Requests Require Authentication
Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

Token is automatically managed when using the frontend application.

---

## Testing

### Running Tests

```bash
# Run all tests once
make test

# Run tests in watch mode
cd FinanceTracker/server && npm run test:watch
```

### Test Coverage

Test files are located in `FinanceTracker/server/src/__tests__/`:
- `auth-flow.test.ts` — Authentication flows
- `transactions-crud.test.ts` — Transaction operations
- `loans-crud.test.ts` — Loan management
- `balances.test.ts` — Balance calculations
- `financial.test.ts` — Financial calculations
- `reports.test.ts` — Reporting functionality
- `middleware.test.ts` — Middleware validation

### Writing Tests

Tests use **Vitest**. Example:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('My Feature', () => {
  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

---

## Troubleshooting

### Common Issues

#### 1. **Port Already in Use**
```bash
# Change port in .env
PORT=3002

# Or kill process using port 3001
lsof -ti:3001 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3001   # Windows (find PID)
taskkill /PID <PID> /F         # Windows (kill)
```

#### 2. **Database Connection Error**
- Verify `DATABASE_URL` in `.env` is correct
- Check PostgreSQL server is running
- For Neon/Supabase: Verify network access is enabled
- Test connection: `psql $DATABASE_URL`

#### 3. **Dependencies Not Installed**
```bash
make install
# or
npm install --workspace
```

#### 4. **Frontend Can't Reach API**
- Ensure backend is running on `http://localhost:3001`
- Check `FRONTEND_URL` and `CORS_ORIGIN` in `.env`
- Verify API client is using correct base URL

#### 5. **Email Verification Not Working**
- SMTP credentials may be incorrect
- Check server logs for error messages
- Codes are logged to console if SMTP not configured
- For Gmail: Verify App Password is generated correctly

#### 6. **Build Fails**
```bash
# Clear dependencies
rm -rf node_modules FinanceTracker/client/node_modules FinanceTracker/server/node_modules

# Reinstall
make install

# Try building again
make build
```

#### 7. **TypeScript Compilation Errors**
```bash
# Rebuild TypeScript
cd FinanceTracker/server && npx tsc --noEmit
cd FinanceTracker/client && npx tsc --noEmit
```

### Getting Help

1. Check logs: `FinanceTracker/server/` terminal output
2. Enable debug logging: `DEBUG=* npm run dev:server`
3. Check API responses in browser DevTools Network tab
4. Review error messages in browser console

---

## Contributing

### Development Guidelines

1. **Code Style**
   - Use TypeScript for type safety
   - Follow existing code patterns
   - Use meaningful variable/function names
   - Add comments for complex logic

2. **Commits**
   - Write clear commit messages
   - One feature per commit when possible
   - Reference issues if applicable

3. **Testing**
   - Write tests for new features
   - Ensure all tests pass: `make test`
   - Test locally before pushing

4. **Pull Requests**
   - Describe changes clearly
   - Link related issues
   - Request review from maintainers

### Reporting Bugs

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (Node version, OS, browser)
- Error messages or logs

---

## Project Roadmap

### Current Features ✅
- User authentication and authorization
- Account management
- Transaction tracking
- People and lending management
- Loan tracking
- Dashboard and reports
- Dark mode
- Responsive design

### Planned Enhancements 🚀
- Mobile app (React Native)
- Advanced reporting and analytics
- Budget tracking
- Recurring transactions
- Data export (CSV, PDF)
- Multi-currency support
- Bank account integration (Plaid)
- Notifications and alerts

---

## License

This project is proprietary. All rights reserved.

---

## Support

For support, questions, or feedback:
- Check the [Requirements Document](personal-finance-tracker-requirements.md)
- Review [Deployment Guide](DEPLOYMENT.md)
- Check the troubleshooting section above

---

## Quick Reference

### Common Commands

```bash
make help              # Show all available commands
make install           # Install dependencies
make dev               # Start dev servers (frontend + backend)
make dev-server        # Start backend only
make dev-client        # Start frontend only
make build             # Build for production
make start             # Run production server
make test              # Run all tests
make db-create         # Create database
make db-reset          # Reset database
make db-seed           # Seed sample data
```

### Environment Quick Links
- **Frontend (Dev):** http://localhost:5173
- **Backend API (Dev):** http://localhost:3001/api
- **Production API:** https://yourdomain.com/api

---

**Happy tracking! 💰**
