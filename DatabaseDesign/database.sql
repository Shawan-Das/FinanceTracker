-- =============================================================================
-- Personal Finance Tracker — PostgreSQL Schema
-- Schema: finance_tracker
--
-- SECURITY: All primary keys use prefixed random IDs (e.g. usr_, txn_, acc_)
-- instead of sequential integers to prevent ID guessing/enumeration attacks.
-- Format: {prefix}_{12-char base62 random string}
-- =============================================================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS finance_tracker;

-- =============================================================================
-- USERS
-- =============================================================================
CREATE TABLE finance_tracker.users (
    id              VARCHAR(16) PRIMARY KEY,
    full_name       VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked       BOOLEAN NOT NULL DEFAULT FALSE,
    locked_until    TIMESTAMPTZ,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    last_failed_login     TIMESTAMPTZ,
    default_currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON finance_tracker.users (email);

-- =============================================================================
-- EMAIL VERIFICATION CODES
-- =============================================================================
CREATE TABLE finance_tracker.email_verifications (
    id              VARCHAR(16) PRIMARY KEY,
    user_id         VARCHAR(16) NOT NULL REFERENCES finance_tracker.users(id) ON DELETE CASCADE,
    code            VARCHAR(10) NOT NULL,
    purpose         VARCHAR(20) NOT NULL CHECK (purpose IN ('registration', 'password_reset')),
    expires_at      TIMESTAMPTZ NOT NULL,
    used            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verifications_user_purpose ON finance_tracker.email_verifications (user_id, purpose);
CREATE INDEX idx_email_verifications_code ON finance_tracker.email_verifications (code);

-- =============================================================================
-- LOGIN ATTEMPTS (for brute-force protection)
-- =============================================================================
CREATE TABLE finance_tracker.login_attempts (
    id          VARCHAR(16) PRIMARY KEY,
    email       VARCHAR(255) NOT NULL,
    ip_address  INET,
    success     BOOLEAN NOT NULL DEFAULT FALSE,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_email_time ON finance_tracker.login_attempts (email, attempted_at);

-- =============================================================================
-- ACCOUNTS
-- =============================================================================
CREATE TABLE finance_tracker.accounts (
    id                  VARCHAR(16) PRIMARY KEY,
    user_id             VARCHAR(16) NOT NULL REFERENCES finance_tracker.users(id) ON DELETE CASCADE,
    name                VARCHAR(255) NOT NULL,
    account_type        VARCHAR(20) NOT NULL CHECK (account_type IN ('BANK', 'CASH', 'MOBILE_WALLET', 'OTHER')),
    currency            VARCHAR(3) NOT NULL DEFAULT 'BDT',
    opening_balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
    opening_balance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_user_id ON finance_tracker.accounts (user_id);
CREATE UNIQUE INDEX idx_accounts_user_name ON finance_tracker.accounts (user_id, name);

-- =============================================================================
-- PEOPLE
-- =============================================================================
CREATE TABLE finance_tracker.people (
    id          VARCHAR(16) PRIMARY KEY,
    user_id     VARCHAR(16) NOT NULL REFERENCES finance_tracker.users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    phone       VARCHAR(50),
    email       VARCHAR(255),
    notes       TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_people_user_id ON finance_tracker.people (user_id);

-- =============================================================================
-- CATEGORIES
-- =============================================================================
CREATE TABLE finance_tracker.categories (
    id          VARCHAR(16) PRIMARY KEY,
    user_id     VARCHAR(16) NOT NULL REFERENCES finance_tracker.users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    type        VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    icon        VARCHAR(50),
    color       VARCHAR(7),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_user_id ON finance_tracker.categories (user_id);
CREATE UNIQUE INDEX idx_categories_user_name_type ON finance_tracker.categories (user_id, name, type);

-- =============================================================================
-- LOANS
-- =============================================================================
CREATE TABLE finance_tracker.loans (
    id              VARCHAR(16) PRIMARY KEY,
    user_id         VARCHAR(16) NOT NULL REFERENCES finance_tracker.users(id) ON DELETE CASCADE,
    person_id       VARCHAR(16) REFERENCES finance_tracker.people(id) ON DELETE SET NULL,
    direction       VARCHAR(10) NOT NULL CHECK (direction IN ('BORROWED', 'LENT')),
    principal_amount NUMERIC(15,2) NOT NULL CHECK (principal_amount > 0),
    interest_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAID', 'OVERDUE', 'CANCELLED')),
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loans_user_id ON finance_tracker.loans (user_id);
CREATE INDEX idx_loans_person_id ON finance_tracker.loans (person_id);
CREATE INDEX idx_loans_user_status ON finance_tracker.loans (user_id, status);

-- =============================================================================
-- TRANSACTIONS
-- =============================================================================
CREATE TABLE finance_tracker.transactions (
    id              VARCHAR(16) PRIMARY KEY,
    user_id         VARCHAR(16) NOT NULL REFERENCES finance_tracker.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN (
        'INCOME', 'EXPENSE', 'TRANSFER',
        'LEND', 'LEND_REPAYMENT', 'BORROW', 'BORROW_REPAYMENT',
        'ADJUSTMENT'
    )),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    account_id      VARCHAR(16) REFERENCES finance_tracker.accounts(id) ON DELETE SET NULL,
    person_id       VARCHAR(16) REFERENCES finance_tracker.people(id) ON DELETE SET NULL,
    category_id     VARCHAR(16) REFERENCES finance_tracker.categories(id) ON DELETE SET NULL,
    loan_id         VARCHAR(16) REFERENCES finance_tracker.loans(id) ON DELETE SET NULL,
    description     TEXT,
    reference       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_transactions_user_date ON finance_tracker.transactions (user_id, transaction_date);
CREATE INDEX idx_transactions_user_account_date ON finance_tracker.transactions (user_id, account_id, transaction_date);
CREATE INDEX idx_transactions_user_person_date ON finance_tracker.transactions (user_id, person_id, transaction_date);
CREATE INDEX idx_transactions_user_type_date ON finance_tracker.transactions (user_id, transaction_type, transaction_date);
CREATE INDEX idx_transactions_user_category ON finance_tracker.transactions (user_id, category_id);
CREATE INDEX idx_transactions_not_deleted ON finance_tracker.transactions (user_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- TRANSACTION TRANSFERS (links the two sides of a transfer)
-- =============================================================================
CREATE TABLE finance_tracker.transaction_transfers (
    id              VARCHAR(16) PRIMARY KEY,
    transaction_id  VARCHAR(16) NOT NULL REFERENCES finance_tracker.transactions(id) ON DELETE CASCADE,
    from_account_id VARCHAR(16) NOT NULL REFERENCES finance_tracker.accounts(id) ON DELETE CASCADE,
    to_account_id   VARCHAR(16) NOT NULL REFERENCES finance_tracker.accounts(id) ON DELETE CASCADE,
    amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_transfer_different_accounts CHECK (from_account_id != to_account_id)
);

CREATE INDEX idx_transaction_transfers_transaction_id ON finance_tracker.transaction_transfers (transaction_id);

-- =============================================================================
-- LOAN REPAYMENTS
-- =============================================================================
CREATE TABLE finance_tracker.loan_repayments (
    id              VARCHAR(16) PRIMARY KEY,
    loan_id         VARCHAR(16) NOT NULL REFERENCES finance_tracker.loans(id) ON DELETE CASCADE,
    transaction_id  VARCHAR(16) REFERENCES finance_tracker.transactions(id) ON DELETE SET NULL,
    amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    repayment_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loan_repayments_loan_id ON finance_tracker.loan_repayments (loan_id);

-- =============================================================================
-- SEED DATA: Default income categories
-- =============================================================================
-- These are inserted per-user at registration time by the application.
-- The SQL below is for reference. The application code will insert these
-- when a new user registers.

-- Income categories (inserted by app for each new user):
-- Salary, Bonus, Freelance, Business Income, Gift Received, Interest, Other Income

-- Expense categories (inserted by app for each new user):
-- Food, Transport, Rent, Shopping, Utilities, Entertainment, Education, Medical, Other Expense

-- =============================================================================
-- VIEWS: Useful financial summaries
-- =============================================================================

-- View: Account balances derived from transactions
DROP VIEW IF EXISTS finance_tracker.v_account_balances;

CREATE VIEW finance_tracker.v_account_balances AS
SELECT
    a.id AS account_id,
    a.user_id,
    a.name,
    a.name AS account_name,
    a.account_type,
    a.currency,
    a.opening_balance,
    a.opening_balance_date,
    a.is_active,
    a.notes,
    a.created_at,
    a.updated_at,
    COALESCE(income.total, 0) AS total_income,
    COALESCE(expense.total, 0) AS total_expense,
    COALESCE(lend.total, 0) AS total_lent,
    COALESCE(lend_repaid.total, 0) AS total_lent_repaid,
    COALESCE(borrow.total, 0) AS total_borrowed,
    COALESCE(borrow_repaid.total, 0) AS total_borrow_repaid,
    COALESCE(transfer_in.total, 0) AS total_transfer_in,
    COALESCE(transfer_out.total, 0) AS total_transfer_out,
    (
        a.opening_balance
        + COALESCE(income.total, 0)
        - COALESCE(expense.total, 0)
        - COALESCE(lend.total, 0)
        + COALESCE(lend_repaid.total, 0)
        + COALESCE(borrow.total, 0)
        - COALESCE(borrow_repaid.total, 0)
        + COALESCE(transfer_in.total, 0)
        - COALESCE(transfer_out.total, 0)
    ) AS current_balance
FROM finance_tracker.accounts a
LEFT JOIN (
    SELECT account_id, SUM(amount) AS total
    FROM finance_tracker.transactions
    WHERE transaction_type = 'INCOME' AND deleted_at IS NULL
    GROUP BY account_id
) income ON income.account_id = a.id
LEFT JOIN (
    SELECT account_id, SUM(amount) AS total
    FROM finance_tracker.transactions
    WHERE transaction_type = 'EXPENSE' AND deleted_at IS NULL
    GROUP BY account_id
) expense ON expense.account_id = a.id
LEFT JOIN (
    SELECT account_id, SUM(amount) AS total
    FROM finance_tracker.transactions
    WHERE transaction_type = 'LEND' AND deleted_at IS NULL
    GROUP BY account_id
) lend ON lend.account_id = a.id
LEFT JOIN (
    SELECT account_id, SUM(amount) AS total
    FROM finance_tracker.transactions
    WHERE transaction_type = 'LEND_REPAYMENT' AND deleted_at IS NULL
    GROUP BY account_id
) lend_repaid ON lend_repaid.account_id = a.id
LEFT JOIN (
    SELECT account_id, SUM(amount) AS total
    FROM finance_tracker.transactions
    WHERE transaction_type = 'BORROW' AND deleted_at IS NULL
    GROUP BY account_id
) borrow ON borrow.account_id = a.id
LEFT JOIN (
    SELECT account_id, SUM(amount) AS total
    FROM finance_tracker.transactions
    WHERE transaction_type = 'BORROW_REPAYMENT' AND deleted_at IS NULL
    GROUP BY account_id
) borrow_repaid ON borrow_repaid.account_id = a.id
LEFT JOIN (
    SELECT to_account_id AS account_id, SUM(tt.amount) AS total
    FROM finance_tracker.transaction_transfers tt
    JOIN finance_tracker.transactions t ON t.id = tt.transaction_id
    WHERE t.deleted_at IS NULL
    GROUP BY to_account_id
) transfer_in ON transfer_in.account_id = a.id
LEFT JOIN (
    SELECT from_account_id AS account_id, SUM(tt.amount) AS total
    FROM finance_tracker.transaction_transfers tt
    JOIN finance_tracker.transactions t ON t.id = tt.transaction_id
    WHERE t.deleted_at IS NULL
    GROUP BY from_account_id
) transfer_out ON transfer_out.account_id = a.id
WHERE a.is_active = TRUE;

-- View: Person balances (receivable and payable) — NET calculation
-- When you both lend to and borrow from the same person, balances are netted.
-- e.g. Lend 1000 + Borrow 200 → net: they owe you 800
DROP VIEW IF EXISTS finance_tracker.v_person_balances;

CREATE VIEW finance_tracker.v_person_balances AS
SELECT
    p.id,
    p.user_id,
    p.id AS person_id,
    p.name,
    p.name AS person_name,
    p.phone,
    p.email,
    p.notes,
    p.is_active,
    p.created_at,
    p.updated_at,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'LEND' THEN t.amount ELSE 0 END), 0) AS total_lent,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'LEND_REPAYMENT' THEN t.amount ELSE 0 END), 0) AS total_lent_repaid,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'BORROW' THEN t.amount ELSE 0 END), 0) AS total_borrowed,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'BORROW_REPAYMENT' THEN t.amount ELSE 0 END), 0) AS total_borrow_repaid,
    -- Net balance: positive means they owe you, negative means you owe them
    GREATEST(
        (
            COALESCE(SUM(CASE WHEN t.transaction_type = 'LEND' THEN t.amount ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN t.transaction_type = 'LEND_REPAYMENT' THEN t.amount ELSE 0 END), 0)
        )
        - (
            COALESCE(SUM(CASE WHEN t.transaction_type = 'BORROW' THEN t.amount ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN t.transaction_type = 'BORROW_REPAYMENT' THEN t.amount ELSE 0 END), 0)
        ),
        0
    ) AS amount_they_owe_you,
    GREATEST(
        (
            COALESCE(SUM(CASE WHEN t.transaction_type = 'BORROW' THEN t.amount ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN t.transaction_type = 'BORROW_REPAYMENT' THEN t.amount ELSE 0 END), 0)
        )
        - (
            COALESCE(SUM(CASE WHEN t.transaction_type = 'LEND' THEN t.amount ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN t.transaction_type = 'LEND_REPAYMENT' THEN t.amount ELSE 0 END), 0)
        ),
        0
    ) AS amount_you_owe_them
FROM finance_tracker.people p
LEFT JOIN finance_tracker.transactions t
    ON t.person_id = p.id
    AND t.deleted_at IS NULL
    AND t.transaction_type IN ('LEND', 'LEND_REPAYMENT', 'BORROW', 'BORROW_REPAYMENT')
WHERE p.is_active = TRUE
GROUP BY p.id, p.user_id, p.name, p.phone, p.email, p.notes, p.is_active, p.created_at, p.updated_at;

-- View: Dashboard summary
CREATE OR REPLACE VIEW finance_tracker.v_dashboard_summary AS
SELECT
    user_id,
    SUM(CASE WHEN transaction_type IN ('INCOME', 'BORROW', 'LEND_REPAYMENT') THEN amount ELSE 0 END)
        - SUM(CASE WHEN transaction_type IN ('EXPENSE', 'BORROW_REPAYMENT', 'LEND') THEN amount ELSE 0 END)
        AS net_cash_flow,
    SUM(CASE WHEN transaction_type = 'INCOME' THEN amount ELSE 0 END) AS total_income,
    SUM(CASE WHEN transaction_type = 'EXPENSE' THEN amount ELSE 0 END) AS total_expense,
    GREATEST(SUM(CASE WHEN transaction_type IN ('LEND') THEN amount ELSE 0 END)
        - SUM(CASE WHEN transaction_type IN ('LEND_REPAYMENT') THEN amount ELSE 0 END), 0)
        AS total_receivable,
    GREATEST(SUM(CASE WHEN transaction_type IN ('BORROW') THEN amount ELSE 0 END)
        - SUM(CASE WHEN transaction_type IN ('BORROW_REPAYMENT') THEN amount ELSE 0 END), 0)
        AS total_payable
FROM finance_tracker.transactions
WHERE deleted_at IS NULL
GROUP BY user_id;
