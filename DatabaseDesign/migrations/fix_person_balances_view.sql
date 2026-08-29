-- =============================================================================
-- Migration: Fix v_person_balances view
-- The view was missing person columns (id, name, phone, email, notes, etc.)
-- that the frontend Person type expects for consistency.
-- =============================================================================

DROP VIEW IF EXISTS finance_tracker.v_person_balances;

CREATE VIEW finance_tracker.v_person_balances AS
SELECT
    p.id,
    t.user_id,
    t.person_id,
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
    (
        COALESCE(SUM(CASE WHEN t.transaction_type = 'LEND' THEN t.amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN t.transaction_type = 'LEND_REPAYMENT' THEN t.amount ELSE 0 END), 0)
    ) AS amount_they_owe_you,
    (
        COALESCE(SUM(CASE WHEN t.transaction_type = 'BORROW' THEN t.amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN t.transaction_type = 'BORROW_REPAYMENT' THEN t.amount ELSE 0 END), 0)
    ) AS amount_you_owe_them
FROM finance_tracker.transactions t
JOIN finance_tracker.people p ON p.id = t.person_id
WHERE t.person_id IS NOT NULL
  AND t.deleted_at IS NULL
  AND t.transaction_type IN ('LEND', 'LEND_REPAYMENT', 'BORROW', 'BORROW_REPAYMENT')
GROUP BY t.user_id, t.person_id, p.id, p.name, p.phone, p.email, p.notes, p.is_active, p.created_at, p.updated_at;
