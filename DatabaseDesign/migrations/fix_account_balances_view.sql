-- =============================================================================
-- Migration: Fix v_account_balances view
-- The view was missing columns (name, opening_balance_date, notes, etc.)
-- that the frontend depends on for rendering and editing accounts.
-- Also fixes the ORDER BY in the accounts API route.
-- =============================================================================

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
