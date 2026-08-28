# Personal Finance Tracker — Product Requirements & Technical Specification

## 1. Project Overview

**Project name:** Personal Finance Tracker

The Personal Finance Tracker is a web-based software application that helps an individual keep a complete and understandable record of their personal financial activity.

The system should answer questions such as:

- How much money do I currently have?
- How much money is in each bank account, cash wallet, or other account?
- How much money have I spent?
- How much money have I received?
- How much money do I owe other people?
- How much money do other people owe me?
- How much loan do I currently have?
- How much loan repayment is due?
- How much money have I lent to someone?
- How much money have I borrowed?
- What transactions happened with a particular person?
- What transactions happened during a particular date range?
- What is my financial position as of a particular date?

The application should behave primarily as a **personal financial ledger**, not as a banking system. It records transactions entered by the user and calculates balances and outstanding amounts from those records.

---

# 2. Core Product Goals

The application must provide:

1. **Account tracking**
   - Bank accounts
   - Cash
   - Other personal money accounts/wallets

2. **Transaction tracking**
   - Income
   - Expenses
   - Transfers between the user's own accounts
   - Money lent to another person
   - Money received back from a person
   - Money borrowed from another person
   - Repayment of borrowed money
   - Loan-related transactions
   - Other financial adjustments when necessary

3. **Person tracking**
   - Maintain a list of people who have financial relationships with the user.
   - Track exactly how much the user owes each person.
   - Track exactly how much each person owes the user.
   - Show complete transaction history with a selected person.

4. **Ledger**
   - Every transaction must be stored with date, amount, account, person/category where applicable, description/particular, and other required information.
   - Users can filter ledger records by date range, account, person, transaction type, and category.

5. **Dashboard**
   - Current total money
   - Money by account
   - Total receivable
   - Total payable
   - Loan balances
   - Recent transactions
   - Useful financial summaries

6. **Simple deployment**
   - React + TypeScript frontend
   - Node.js backend/API
   - PostgreSQL database
   - Frontend and backend deployed as one web application/system
   - The user should access the application from one URL.
   - There should be no requirement for the user to know or separately access an API URL.

---

# 3. Technology Requirements

## Frontend

- React
- TypeScript
- Modern React architecture
- Responsive UI
- Desktop-first but mobile-friendly
- Component-based architecture
- Client-side routing where appropriate
- Form validation
- Clear loading, empty, success, and error states

Recommended UI stack:

- React + TypeScript
- React Router
- A mature UI/component library or Bootstrap/Tailwind
- TanStack Query or equivalent for server-state management
- A charting library for dashboard visualizations

The exact frontend libraries can be decided during implementation, but the architecture must remain maintainable.

## Backend

- Node.js
- TypeScript
- REST API
- PostgreSQL
- ORM/query builder may be selected by the implementation agent.

Recommended options:

- Fastify or Express
- Prisma, Drizzle, or another suitable PostgreSQL data-access layer

The backend should expose REST endpoints internally and serve the React application from the same deployment.

## Database

- PostgreSQL

The database must be designed around a reliable transaction/ledger model.

Money values must **never** be stored as floating-point numbers.

Use:

- `NUMERIC/DECIMAL` for monetary values

or an integer representation using the smallest currency unit.

The selected approach must be consistent throughout the system.

---

# 4. Single-System Deployment Architecture

The production application should behave as one web application.

Example:

```text
https://finance.example.com
```

The user accesses only this URL.

A suitable production architecture is:

```text
Browser
   |
   v
Node.js Application
   |
   +---- React static files
   |
   +---- REST API (/api/...)
   |
   v
PostgreSQL
```

The Node.js application should:

1. Serve the compiled React frontend.
2. Handle `/api/*` requests.
3. Communicate with PostgreSQL.
4. Provide authentication/session handling.
5. Return the React application's `index.html` for frontend routes when necessary.

Example:

```text
GET  /
GET  /dashboard
GET  /transactions
GET  /people

API:
GET    /api/transactions
POST   /api/transactions
GET    /api/accounts
POST   /api/accounts
GET    /api/people
POST   /api/people
```

There should be no requirement to deploy the React frontend and Node.js API as separate publicly accessible services.

For development, frontend and backend may run separately, but production should support the single-origin deployment model.

---

# 5. User Authentication

The first version should support personal user accounts.

## Registration

User provides:

- Full name
- Email
- Password
- Confirm password

The system should validate the information and create the user account.

## Login

User provides:

- Email
- Password

After successful login, the user is redirected to the dashboard.

## Security Requirements

- Passwords must be securely hashed.
- Never store plain-text passwords.
- Authentication should use secure HTTP-only cookies/session or another secure authentication mechanism.
- CSRF protection should be considered when cookie-based authentication is used.
- Users must only be able to access their own financial data.
- Every user-owned database record must be scoped to the authenticated user.

---

# 6. Main Domain Concepts

The system revolves around these concepts:

```text
User
 |
 +-- Accounts
 |
 +-- People
 |
 +-- Categories
 |
 +-- Transactions
 |
 +-- Loans / Debts
 |
 +-- Transaction Ledger
```

The implementation should keep these concepts separate rather than putting everything into one large transaction table without structure.

---

# 7. Accounts

An account represents a place where the user's money is held.

Examples:

- Dutch-Bangla Bank
- BRAC Bank
- City Bank
- bKash
- Nagad
- Cash Wallet
- Savings Account
- Salary Account

An account should contain at least:

- ID
- User ID
- Name
- Account type
- Currency
- Opening balance
- Opening balance date
- Status
- Notes
- Created timestamp
- Updated timestamp

## Account Types

Initial account types may include:

- BANK
- CASH
- MOBILE_WALLET
- OTHER

The design should allow additional account types later.

## Account Balance

Current account balance should be derived from:

```text
Opening Balance
+ Money Received
- Money Spent
+ Transfers In
- Transfers Out
+/- Other Adjustments
```

The system must ensure that transfers between the user's own accounts do not incorrectly increase the user's total wealth.

Example:

```text
Bank Account: 50,000
Cash:         10,000

Total money = 60,000
```

If the user transfers 5,000 from Bank to Cash:

```text
Bank: 45,000
Cash: 15,000

Total money = 60,000
```

---

# 8. People

A person represents another individual or entity with whom the user has a financial relationship.

Examples:

- Friend
- Brother
- Family member
- Colleague
- Business contact

Person fields:

- ID
- User ID
- Name
- Phone (optional)
- Email (optional)
- Notes
- Active/inactive status
- Created timestamp
- Updated timestamp

A person can have both:

- Money owed **to the user**
- Money owed **by the user**

These must be calculated independently or represented through a clear net balance.

Example:

```text
User lent Rahim: 10,000
Rahim returned:   4,000

Rahim owes user:  6,000
```

Another example:

```text
User borrowed from Karim: 20,000
User repaid Karim:        7,000

User owes Karim:          13,000
```

If both directions exist:

```text
Rahim owes user: 10,000
User owes Rahim: 3,000

Net receivable from Rahim = 7,000
```

The UI must clearly distinguish these amounts instead of hiding the direction.

---

# 9. Categories

Categories help classify normal income and expense transactions.

## Income examples

- Salary
- Bonus
- Freelance
- Business Income
- Gift Received
- Interest
- Other Income

## Expense examples

- Food
- Transport
- Rent
- Shopping
- Utilities
- Entertainment
- Medical
- Education
- Other Expense

The category model should support:

- ID
- User ID
- Name
- Type: INCOME / EXPENSE
- Icon/color metadata if desired
- Active status
- Created timestamp

System/default categories may be provided during user registration.

Users should be able to create custom categories.

---

# 10. Transaction Model

The transaction system is the most important part of the application.

Every financial event entered by the user must be recorded in a durable ledger.

Each transaction should have:

- ID
- User ID
- Transaction date/time
- Transaction type
- Amount
- Account
- Person (optional)
- Category (optional)
- Description/particular
- Reference/note (optional)
- Created timestamp
- Updated timestamp

The transaction model must preserve the **direction and financial meaning** of the transaction.

---

# 11. Transaction Types

The initial transaction types should include:

```text
INCOME
EXPENSE
TRANSFER
LEND
LEND_REPAYMENT
BORROW
BORROW_REPAYMENT
ADJUSTMENT
```

The implementation may use a more normalized internal model if it makes accounting logic safer, but the user-facing behavior must support these operations.

---

# 12. Income Transaction

Example:

> User receives salary of 50,000 into Bank Account.

Transaction:

```text
Type: INCOME
Category: Salary
Account: Bank Account
Amount: 50,000
Date: 2026-08-01
Particular: August Salary
```

Result:

```text
Bank balance +50,000
Total money +50,000
```

---

# 13. Expense Transaction

Example:

> User spends 500 cash for lunch.

Transaction:

```text
Type: EXPENSE
Category: Food
Account: Cash
Amount: 500
Date: 2026-08-29
Particular: Lunch
```

Result:

```text
Cash balance -500
Total money -500
```

---

# 14. Transfer Between Own Accounts

Example:

> User transfers 10,000 from Bank Account to Cash.

This is **not income** and **not expense**.

It should create a transfer relationship:

```text
From:
Bank Account -10,000

To:
Cash +10,000
```

Total user money remains unchanged.

The UI should show this as one transfer transaction rather than requiring the user to manually create two unrelated transactions.

---

# 15. Lending Money

Example:

> User gives 5,000 cash to friend Rahim.

This event has two effects:

```text
Cash balance: -5,000
Rahim owes user: +5,000
```

Transaction:

```text
Type: LEND
Person: Rahim
Account: Cash
Amount: 5,000
Particular: Lent money to Rahim
```

This must **not** be treated as a normal expense because the user still owns the receivable.

The user's total net financial position should account for the receivable.

---

# 16. Lending Repayment

Example:

> Rahim returns 2,000 cash.

Transaction:

```text
Type: LEND_REPAYMENT
Person: Rahim
Account: Cash
Amount: 2,000
Particular: Rahim returned money
```

Effects:

```text
Cash balance +2,000
Rahim's outstanding debt to user -2,000
```

If Rahim originally owed 5,000:

```text
Original receivable: 5,000
Returned:            2,000
Remaining:           3,000
```

---

# 17. Borrowing Money

Example:

> User receives 20,000 from Karim.

Transaction:

```text
Type: BORROW
Person: Karim
Account: Bank
Amount: 20,000
Particular: Borrowed money from Karim
```

Effects:

```text
Bank balance +20,000
User owes Karim: +20,000
```

This is not normal income because the user has a liability.

---

# 18. Borrow Repayment

Example:

> User repays 5,000 to Karim from Bank.

Transaction:

```text
Type: BORROW_REPAYMENT
Person: Karim
Account: Bank
Amount: 5,000
Particular: Loan repayment to Karim
```

Effects:

```text
Bank balance -5,000
User's debt to Karim -5,000
```

---

# 19. Loans

The system should support loans as a first-class concept rather than relying only on generic person transactions.

A loan may represent:

- Money borrowed by the user
- Money lent by the user
- Formal loan from a bank
- Personal loan
- Other debt arrangements

A loan should support:

- ID
- User ID
- Person/lender/borrower when applicable
- Loan direction
- Principal amount
- Interest information if required
- Start date
- Due date
- Status
- Description
- Created timestamp
- Updated timestamp

Possible directions:

```text
BORROWED
LENT
```

The system should be designed so loan repayment history can be linked to the loan.

---

# 20. Loan Due Tracking

The user should be able to see:

- Total loan principal
- Amount already repaid
- Remaining amount
- Next due date
- Overdue amount/status
- Loan status

Example:

```text
Loan: 100,000
Repaid: 30,000
Remaining: 70,000
Due Date: 2026-12-31
```

The dashboard should highlight overdue or upcoming loan payments.

For the first version, automatic interest calculation is optional unless explicitly required.

---

# 21. Ledger

The ledger is the central historical view.

It should display transactions in chronological order.

Example:

| Date | Particular | Type | Account | Person | Amount | Effect |
|------|------------|------|---------|--------|--------|--------|
| Aug 01 | August Salary | Income | Bank | - | 50,000 | +50,000 |
| Aug 02 | Rent | Expense | Bank | - | 15,000 | -15,000 |
| Aug 05 | Lent money | Lend | Cash | Rahim | 5,000 | -5,000 |
| Aug 12 | Rahim returned | Lend Repayment | Cash | Rahim | 2,000 | +2,000 |

The ledger should support:

- Date range
- Person
- Account
- Category
- Transaction type
- Minimum amount
- Maximum amount
- Search by description
- Sort order
- Pagination

---

# 22. Running Balance

The ledger should optionally show a running balance.

For an account:

```text
Opening balance
+/- each transaction
= running balance
```

For the overall financial ledger, the implementation must distinguish:

1. Cash/account balance
2. Receivables
3. Liabilities

This prevents misleading calculations.

---

# 23. Overall Financial Position

The application should provide a clear current financial position.

At minimum:

```text
Total Cash & Accounts
+ Money Receivable
- Money Payable
= Net Financial Position
```

Example:

```text
Bank + Cash:              100,000
People owe me:             20,000
I owe people:              10,000
                           -------
Net Financial Position:   110,000
```

This should be different from simply adding all transaction amounts.

---

# 24. Person Ledger

When a user selects a person, the system should show all relevant transactions with that person.

Example:

```text
Rahim

Rahim owes you:      6,000
You owe Rahim:       0
Net:                 +6,000
```

Transaction history:

```text
Aug 05  Lent to Rahim       5,000
Aug 12  Rahim returned      2,000
Aug 20  Lent to Rahim       3,000
--------------------------------
Outstanding                6,000
```

The person page should include:

- Current balance
- Receivable
- Payable
- Transaction history
- Date filtering
- Add transaction button

---

# 25. Dashboard

The dashboard is the main landing page after login.

It should show:

## Financial Summary

- Total money in accounts
- Total receivable
- Total payable
- Net financial position
- Total income for selected period
- Total expense for selected period

## Account Summary

Example:

```text
Bank              ৳80,000
Cash              ৳10,000
bKash             ৳5,000
-------------------------
Total             ৳95,000
```

## People / Debt Summary

```text
People owe you:   ৳20,000
You owe people:   ৳10,000
```

## Recent Transactions

Show the latest transactions.

## Charts

Potential charts:

- Income vs expense by month
- Expense by category
- Account balance distribution
- Receivable/payable summary

Charts are secondary; correctness and usability of the ledger are more important.

---

# 26. Date Range Support

The user should be able to select:

- Today
- Yesterday
- This week
- This month
- Last month
- This year
- Custom date range

Date filters should be available in:

- Dashboard
- Ledger
- Person transactions
- Account transactions
- Reports

Date/time handling must be consistent and timezone-aware.

---

# 27. Transaction Creation UI

The transaction form should be simple and context-aware.

Example initial selection:

```text
Transaction Type
[ Income ▼ ]

Amount
[ 50,000 ]

Account
[ Bank Account ▼ ]

Category
[ Salary ▼ ]

Date
[ 2026-08-01 ]

Particular
[ August Salary ]

[ Save Transaction ]
```

If the user selects:

```text
Lend
```

the form should dynamically display:

```text
Person
Account
Amount
Date
Particular
```

If the user selects:

```text
Transfer
```

the form should display:

```text
From Account
To Account
Amount
Date
Particular
```

The form must prevent invalid combinations.

---

# 28. Transaction Validation

Examples:

## Expense

Required:

- Amount
- Account
- Date

## Income

Required:

- Amount
- Account
- Category
- Date

## Lend

Required:

- Amount
- Account
- Person
- Date

## Borrow

Required:

- Amount
- Account
- Person
- Date

## Transfer

Required:

- Amount
- From account
- To account
- Date

Validation rules:

- Amount must be greater than zero.
- Source and destination accounts cannot be identical.
- Account/person/category must belong to the current user.
- Transaction date must be valid.
- Required fields must not be empty.
- Invalid transactions must never be persisted partially.

---

# 29. Transaction Editing

Users should be able to edit transactions.

However, editing a transaction that affects:

- account balance
- receivable
- payable
- loan balance

must update all related calculations atomically.

The implementation should use database transactions where necessary.

Example:

Changing a lend transaction from:

```text
5,000
```

to:

```text
7,000
```

must change:

```text
Account balance
Receivable balance
Ledger result
```

consistently.

---

# 30. Transaction Deletion

Users should be able to delete transactions, but deletion must be handled carefully.

Preferred approach:

- Soft delete or audit-aware deletion where practical.

Deleting a transaction must correctly reverse its financial effects.

Example:

If:

```text
Lend = 5,000
```

is deleted, the system must restore:

```text
Cash +5,000
Receivable -5,000
```

No orphaned financial records should remain.

---

# 31. Database Design

The database should be normalized and designed around user ownership.

Suggested core tables:

```text
users
accounts
people
categories
transactions
transaction_transfers
loans
loan_repayments
```

The exact table structure can be improved by the implementation agent if it preserves the required behavior.

---

# 32. Suggested Database Schema

## users

```text
id
full_name
email
password_hash
created_at
updated_at
```

Constraints:

- `email` unique.

---

## accounts

```text
id
user_id
name
account_type
currency
opening_balance
opening_balance_date
is_active
notes
created_at
updated_at
```

Foreign key:

```text
user_id -> users.id
```

Index:

```text
(user_id)
```

---

## people

```text
id
user_id
name
phone
email
notes
is_active
created_at
updated_at
```

Foreign key:

```text
user_id -> users.id
```

---

## categories

```text
id
user_id
name
type
is_active
created_at
updated_at
```

`type`:

```text
INCOME
EXPENSE
```

---

## transactions

A transaction table should contain the common information shared by financial events.

Suggested fields:

```text
id
user_id
transaction_type
transaction_date
amount
account_id
person_id
category_id
description
reference
created_at
updated_at
deleted_at
```

Important:

- `account_id` may be nullable for transaction types where appropriate.
- `person_id` is required for person-related transactions.
- `category_id` is required for categorized income/expense transactions.
- Database constraints and application validation should enforce valid combinations.

---

## transaction_transfers

For transfers between two user accounts:

```text
id
transaction_id
from_account_id
to_account_id
amount
```

This keeps the transfer relationship explicit.

Alternative: use a more generalized double-entry ledger model if the implementation agent determines it is safer.

---

## loans

Suggested fields:

```text
id
user_id
person_id
direction
principal_amount
interest_amount
start_date
due_date
status
description
created_at
updated_at
```

`direction`:

```text
BORROWED
LENT
```

`status`:

```text
ACTIVE
PAID
OVERDUE
CANCELLED
```

---

## loan_repayments

Suggested fields:

```text
id
loan_id
transaction_id
amount
repayment_date
notes
created_at
```

A repayment should link back to the actual financial transaction.

---

# 33. Important Database Design Principle

The implementation agent should consider using a **double-entry or journal-entry-inspired ledger internally**, even if the UI remains simple.

This can significantly reduce balance-calculation errors.

Conceptually:

```text
Salary:
Bank Account       +50,000
Income/Sales        +50,000

Expense:
Expense             +500
Cash Account        -500

Lending:
Receivable          +5,000
Cash Account        -5,000

Borrowing:
Cash/Bank           +20,000
Payable             +20,000
```

The user does not need to see accounting terminology.

The internal model should prioritize:

- Mathematical consistency
- Auditability
- Atomic transactions
- No duplicated balance logic
- Easy reporting
- Correct historical balances

If a double-entry model is implemented, all balance calculations should derive from journal entries rather than independently maintained mutable totals wherever practical.

---

# 34. Avoid Storing Calculated Balances as the Source of Truth

Values such as:

```text
Current account balance
Total amount lent
Total amount borrowed
Person outstanding balance
Net financial position
```

should preferably be calculated from the transaction/journal data.

If cached balances are introduced for performance, they must be treated as derived/cache values and have a reliable reconciliation mechanism.

The database transaction history must remain the authoritative source.

---

# 35. API Requirements

All API routes should be under:

```text
/api
```

Suggested endpoints:

## Authentication

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

## Dashboard

```text
GET /api/dashboard/summary
GET /api/dashboard/recent-transactions
```

## Accounts

```text
GET    /api/accounts
GET    /api/accounts/:id
POST   /api/accounts
PATCH  /api/accounts/:id
DELETE /api/accounts/:id
GET    /api/accounts/:id/transactions
```

## People

```text
GET    /api/people
GET    /api/people/:id
POST   /api/people
PATCH  /api/people/:id
DELETE /api/people/:id
GET    /api/people/:id/summary
GET    /api/people/:id/transactions
```

## Categories

```text
GET    /api/categories
POST   /api/categories
PATCH  /api/categories/:id
DELETE /api/categories/:id
```

## Transactions

```text
GET    /api/transactions
GET    /api/transactions/:id
POST   /api/transactions
PATCH  /api/transactions/:id
DELETE /api/transactions/:id
```

Query parameters should support filtering:

```text
/api/transactions?
from=2026-08-01
&to=2026-08-31
&account_id=...
&person_id=...
&type=EXPENSE
&category_id=...
&page=1
&limit=30
```

## Loans

```text
GET    /api/loans
GET    /api/loans/:id
POST   /api/loans
PATCH  /api/loans/:id
DELETE /api/loans/:id
GET    /api/loans/:id/repayments
POST   /api/loans/:id/repayments
```

---

# 36. API Response Requirements

API responses should use a consistent structure.

Example success:

```json
{
  "success": true,
  "data": {}
}
```

Example error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Amount must be greater than zero"
  }
}
```

Paginated response:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 30,
    "total": 150,
    "totalPages": 5
  }
}
```

Exact format may be adjusted, but it must remain consistent across the API.

---

# 37. UI Structure

Suggested application layout:

```text
------------------------------------------------
| Logo | Search | User Menu                    |
------------------------------------------------
| Sidebar              | Main Content           |
|                      |                        |
| Dashboard            |                        |
| Transactions         |                        |
| Accounts             |                        |
| People               |                        |
| Loans                |                        |
| Categories           |                        |
| Reports              |                        |
| Settings             |                        |
------------------------------------------------
```

## Main pages

### Dashboard

```text
Financial summary
Account balances
Receivable/payable
Recent transactions
Charts
```

### Transactions

```text
Filters
Add Transaction
Ledger table
Pagination
```

### Accounts

```text
Account cards
Balance
Account transaction history
Create/edit account
```

### People

```text
People list
Amount they owe
Amount user owes
Net position
```

### Person Details

```text
Person summary
Transaction history
Add transaction
```

### Loans

```text
Active loans
Due dates
Outstanding amounts
Repayment history
```

### Reports

Possible first-version reports:

- Income report
- Expense report
- Account statement
- Person statement
- Loan report
- Financial position report

---

# 38. UX Principles

The system should be designed for a normal person, not an accountant.

Important principles:

- Avoid unnecessary accounting terminology.
- Make transaction entry fast.
- Make balances immediately understandable.
- Always show whether money is coming in or going out.
- Clearly distinguish "I owe" from "They owe me".
- Use confirmation for destructive actions.
- Provide useful defaults.
- Use human-readable dates and amounts.
- Make important balances visible without requiring multiple screens.

---

# 39. Currency

The initial application should support Bangladesh Taka (BDT/৳), but the database design should not make multi-currency impossible.

Each account should have a currency.

For version 1:

```text
BDT
```

can be the default currency.

Multi-currency conversion can be implemented later.

---

# 40. Reporting Requirements

Reports should be generated from the transaction history.

Required/desired reports:

## Income Report

Show:

- Total income
- Income by category
- Income by date

## Expense Report

Show:

- Total expense
- Expense by category
- Expense by account
- Expense by date

## Account Statement

Show:

- Opening balance
- Transactions
- Running balance
- Closing balance

## Person Statement

Show:

- Money lent
- Money returned
- Money borrowed
- Money repaid
- Outstanding receivable/payable

## Loan Report

Show:

- Principal
- Repaid amount
- Remaining amount
- Due date
- Status

---

# 41. Important Financial Rules

The implementation must follow these rules.

### Rule 1 — Income increases available money

```text
Income -> account balance increases
```

### Rule 2 — Expense decreases available money

```text
Expense -> account balance decreases
```

### Rule 3 — Own-account transfer does not change total wealth

```text
Bank -> Cash
```

changes account balances but not total money.

### Rule 4 — Lending is not an expense

```text
Cash -5,000
Receivable +5,000
```

### Rule 5 — Receiving a loan is not income

```text
Cash +20,000
Payable +20,000
```

### Rule 6 — Repaying a loan is not an expense in the same sense as consumption

It reduces:

```text
Cash
Payable
```

### Rule 7 — Repayment of money lent increases cash and decreases receivable

```text
Cash +2,000
Receivable -2,000
```

### Rule 8 — Historical records must remain mathematically consistent

Changing or deleting transactions must update all affected calculations atomically.

---

# 42. Example End-to-End Scenario

Assume the user starts with:

```text
Bank: 20,000
Cash:  5,000
```

Total:

```text
25,000
```

## Event 1 — Salary

User receives:

```text
50,000 salary into Bank
```

Result:

```text
Bank: 70,000
Cash:  5,000
Total available money: 75,000
```

## Event 2 — Lunch

User spends:

```text
500 Cash
```

Result:

```text
Cash: 4,500
```

## Event 3 — Lend money

User gives:

```text
10,000 Cash to Rahim
```

Result:

```text
Cash:  -10,000
Rahim receivable: +10,000
```

Available cash/accounts:

```text
64,500
```

Receivable:

```text
10,000
```

Net financial position:

```text
74,500
```

## Event 4 — Rahim returns 4,000

Result:

```text
Cash: +4,000
Rahim outstanding: 6,000
```

## Event 5 — User borrows 20,000 from Karim

Result:

```text
Cash/Bank: +20,000
Payable to Karim: +20,000
```

Net financial position should remain mathematically correct because the borrowed cash is offset by the liability.

---

# 43. Search and Filtering

The ledger must be easy to search.

Search should support:

- Particular/description
- Person
- Account
- Category
- Transaction type

Filters should be combinable.

Example:

```text
Date:
01 Aug 2026 - 31 Aug 2026

Person:
Rahim

Type:
All
```

Result:

Only transactions involving Rahim during the selected period.

---

# 44. Pagination

Transaction lists may become large.

The backend must support server-side pagination.

Default:

```text
30 transactions/page
```

The UI should provide:

```text
1 2 3 4 5 ... 20
```

rather than rendering thousands of records at once.

---

# 45. Auditability

Financial data is sensitive and should be traceable.

The system should store:

- Created timestamp
- Updated timestamp
- Optional deleted timestamp

For a more advanced version, an audit log can record:

- Who changed a transaction
- What changed
- Old value
- New value
- Timestamp

This is recommended if transaction editing/deletion becomes extensive.

---

# 46. Data Isolation

This is mandatory.

User A must never be able to access:

- User B's accounts
- User B's people
- User B's transactions
- User B's loans
- User B's categories

Every query must be scoped to the authenticated user.

Do not trust IDs supplied by the frontend.

Example:

Bad:

```sql
SELECT * FROM transactions WHERE id = $1;
```

Better:

```sql
SELECT *
FROM transactions
WHERE id = $1
  AND user_id = $2;
```

---

# 47. Error Handling

The application should handle:

- Invalid input
- Unauthorized access
- Missing records
- Database errors
- Duplicate records where applicable
- Network errors
- Session expiration

The UI should show understandable error messages.

Do not expose internal stack traces or sensitive database details to users.

---

# 48. Database Integrity

Use:

- Foreign keys
- Unique constraints
- Check constraints where useful
- Appropriate indexes
- Database transactions for multi-step financial operations

Important indexes should include:

```text
transactions(user_id, transaction_date)
transactions(user_id, account_id, transaction_date)
transactions(user_id, person_id, transaction_date)
transactions(user_id, transaction_type, transaction_date)
```

Indexes should be reviewed after real query patterns are known.

---

# 49. Atomic Financial Operations

Operations such as:

```text
Lend
Borrow
Transfer
Repayment
```

may affect multiple records.

These operations must be atomic.

For example, transfer:

```text
Create transfer
Decrease source
Increase destination
```

must either complete entirely or fail entirely.

Never allow:

```text
Source account updated
BUT
Destination account not updated
```

---

# 50. Seed Data

On new user registration, the system may create useful default categories such as:

### Income

```text
Salary
Bonus
Freelance
Business Income
Other Income
```

### Expense

```text
Food
Transport
Rent
Shopping
Utilities
Entertainment
Education
Medical
Other Expense
```

The user can customize these later.

---

# 51. Settings

The settings page may contain:

- Profile information
- Password change
- Default currency
- Default date format
- Default transaction page size
- Category management
- Account management
- Data export
- Account deletion

---

# 52. Data Export

Recommended feature:

Allow the user to export financial data.

Possible formats:

```text
CSV
JSON
```

Export may include:

- Transactions
- Accounts
- People
- Loans
- Categories

A future version may support PDF statements.

---

# 53. Backup Considerations

Because the application contains financial information:

- Database backups are strongly recommended.
- Production database backup strategy should be documented.
- Backup retention should be configurable at deployment level.
- Restoring a backup should be tested.

This is an infrastructure concern and should not be implemented as a user-facing feature unless required.

---

# 54. Non-Goals for Version 1

The first version does **not** need:

- Direct bank integration
- Automatic bank transaction import
- Credit card synchronization
- Real-time banking APIs
- Investment portfolio management
- Stock trading
- Cryptocurrency tracking
- Tax filing
- Complex accounting/business bookkeeping
- Payroll management
- Multi-user company accounting
- Automatic currency exchange
- Advanced interest calculation unless specifically required

The focus is:

> **Personal money tracking and a trustworthy financial ledger.**

---

# 55. Recommended Development Phases

## Phase 1 — Foundation

- Project setup
- React + TypeScript
- Node.js + TypeScript
- PostgreSQL
- Authentication
- Database migrations
- Single-system production architecture

## Phase 2 — Basic Money Tracking

- Accounts
- Categories
- Income
- Expenses
- Basic dashboard
- Ledger

## Phase 3 — People & Personal Debt

- People
- Lend
- Lend repayment
- Borrow
- Borrow repayment
- Person ledger
- Receivable/payable dashboard

## Phase 4 — Loans

- Loan creation
- Loan details
- Repayments
- Due dates
- Loan dashboard

## Phase 5 — Reports

- Income reports
- Expense reports
- Account statements
- Person statements
- Financial position

## Phase 6 — Hardening

- Validation
- Security review
- Database constraints
- Error handling
- Auditability
- Performance optimization
- Automated tests
- Backup documentation

---

# 56. Testing Requirements

The project should include automated tests.

## Unit tests

Test financial calculations such as:

- Income
- Expense
- Transfer
- Lending
- Lending repayment
- Borrowing
- Borrow repayment
- Person balances
- Loan balances
- Net financial position

## Integration tests

Test:

- Authentication
- Account creation
- Transaction creation
- Transaction editing
- Transaction deletion
- Person transaction history
- Loan repayment
- User data isolation

## Critical test cases

Example:

```text
Starting Cash = 10,000

Lend 3,000

Expected:
Cash = 7,000
Receivable = 3,000
Net Position = 10,000
```

Another:

```text
Borrow 5,000

Expected:
Cash = 15,000
Payable = 5,000
Net Position = 10,000
```

Another:

```text
Transfer 2,000 from Bank to Cash

Expected:
Bank decreases 2,000
Cash increases 2,000
Total available money unchanged
```

These tests are important because financial calculation errors are more serious than ordinary UI bugs.

---

# 57. Definition of Done

The application can be considered MVP-complete when a user can:

1. Register and log in.
2. Create multiple money accounts.
3. See the balance of each account.
4. Add income.
5. Add expenses.
6. Transfer money between their own accounts.
7. Create people.
8. Record money lent to a person.
9. Record repayment from a person.
10. Record money borrowed from a person.
11. Record repayment of borrowed money.
12. See how much each person owes them.
13. See how much they owe each person.
14. View a complete transaction ledger.
15. Filter transactions by date range.
16. Filter transactions by person/account/type/category.
17. View a person's complete transaction history.
18. View overall financial position.
19. View active loans and remaining balances.
20. Edit and delete transactions safely.
21. Access the complete application from a single production URL.
22. Have all financial data isolated per user.
23. Have automated tests covering core financial calculations.

---

# 58. Important Guidance for AI Coding Agents

AI coding agents working on this project should follow these rules:

## Rule A — Understand the financial model before coding

Do not start by creating arbitrary CRUD tables.

First understand:

```text
Money account
Income
Expense
Transfer
Receivable
Payable
Loan
Ledger
```

Then implement the database model.

## Rule B — Never duplicate financial logic

Balance calculations should have a clear source of truth.

Do not implement:

```text
Account balance calculation in frontend
Account balance calculation in backend
Another account balance calculation in a report
```

with different logic.

Financial calculations should be centralized.

## Rule C — Do not treat lending as an expense

Lending creates a receivable.

## Rule D — Do not treat borrowing as income

Borrowing creates a liability.

## Rule E — Transfers are not income or expense

Transfers only move money between the user's accounts.

## Rule F — Financial operations must be atomic

Use PostgreSQL transactions for multi-record financial operations.

## Rule G — Never trust frontend ownership IDs

Always verify ownership on the backend.

## Rule H — Do not use floating-point numbers for money

Use exact decimal/integer monetary representation.

## Rule I — Preserve historical correctness

Editing/deleting a financial transaction must never leave balances inconsistent.

## Rule J — Keep the UI simple

The user wants to track personal finances, not learn accounting.

---

# 59. Suggested Project Structure

A possible monorepo structure:

```text
finance-tracker/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   └── app/
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── accounts/
│   │   │   ├── people/
│   │   │   ├── categories/
│   │   │   ├── transactions/
│   │   │   ├── loans/
│   │   │   ├── dashboard/
│   │   │   └── reports/
│   │   ├── database/
│   │   ├── middleware/
│   │   ├── shared/
│   │   └── app.ts
│   └── package.json
│
├── migrations/
│
├── tests/
│
├── docker-compose.yml
├── package.json
└── README.md
```

The exact structure can change, but feature/domain boundaries should remain clear.

---

# 60. Final Product Vision

The final application should feel like a personal financial control center.

A user should be able to open the application and immediately understand:

```text
========================================
          MY FINANCIAL POSITION
========================================

Money I have                 ৳95,000

People owe me                ৳20,000

I owe people                 ৳10,000

----------------------------------------
Net Financial Position       ৳105,000
----------------------------------------

Accounts
  Bank                       ৳75,000
  Cash                       ৳15,000
  bKash                       ৳5,000

----------------------------------------

Recent Transactions

29 Aug   Lunch               -৳500
28 Aug   Salary            +৳50,000
25 Aug   Rahim returned     +৳2,000
20 Aug   Lent to Rahim      -৳5,000
```

The most important objective is **financial clarity**.

The application should make it easy for the user to answer:

> **"Where is my money, where did my money go, who owes me, whom do I owe, and what is my actual financial position right now?"**
