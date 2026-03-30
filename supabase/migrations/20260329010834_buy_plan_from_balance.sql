-- Migration: buy_plan_from_balance
-- This function allows users to activate an investment plan using their current wallet balance.
-- Updates are atomic and logged in the transactions table.

CREATE OR REPLACE FUNCTION public.buy_plan_from_balance(
    p_user_id UUID,
    p_plan_id UUID,
    p_amount DECIMAL,
    p_duration_days INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_balance DECIMAL;
BEGIN
    -- 1. Check current balance
    SELECT balance INTO v_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    
    IF v_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- 2. Deduct balance
    UPDATE public.profiles
    SET balance = balance - p_amount
    WHERE id = p_user_id;

    -- 3. Insert transaction record
    INSERT INTO public.transactions (user_id, plan_id, amount, type, status, notes, created_at, updated_at)
    VALUES (p_user_id, p_plan_id, p_amount, 'investment', 'approved', 'Plan activated from balance', NOW(), NOW());

    -- 4. Insert user plan
    INSERT INTO public.user_plans (user_id, plan_id, amount_invested, start_date, end_date, active, total_earned)
    VALUES (p_user_id, p_plan_id, p_amount, NOW(), NOW() + (p_duration_days || ' days')::interval, true, 0.00);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
