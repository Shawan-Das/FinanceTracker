-- Migration: Fix person balance and dashboard summary views
-- Prevents negative receivable/payable values that caused -500 display bugs

-- View: Person balances (receivable and payable)
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
    GREATEST(
        COALESCE(SUM(CASE WHEN t.transaction_type = 'LEND' THEN t.amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN t.transaction_type = 'LEND_REPAYMENT' THEN t.amount ELSE 0 END), 0),
        0
    ) AS amount_they_owe_you,
    GREATEST(
        COALESCE(SUM(CASE WHEN t.transaction_type = 'BORROW' THEN t.amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN t.transaction_type = 'BORROW_REPAYMENT' THEN t.amount ELSE 0 END), 0),
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
