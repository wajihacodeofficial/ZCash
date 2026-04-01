-- 1. Create a secure function to process demo investments atomically
--    This prevents race conditions (e.g., when a user double-refreshes or cron runs twice)
--    by using FOR UPDATE SKIP LOCKED.

CREATE OR REPLACE FUNCTION public.process_demo_investments(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(processed_count INT, credited_amount DECIMAL) AS $$
DECLARE
    inv RECORD;
    profit DECIMAL;
    total_return DECIMAL;
    v_processed INT := 0;
    v_total_credited DECIMAL := 0;
BEGIN
    -- Iterate through all active investments where end_date <= current server time
    FOR inv IN 
        SELECT id, user_id, amount, profit_percentage 
        FROM public.demo_investments 
        WHERE status = 'active' 
          AND end_date <= NOW()
          AND (p_user_id IS NULL OR user_id = p_user_id)
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Calculate profit stringently using the exact mathematical formula
        profit := (inv.amount * inv.profit_percentage) / 100.0;
        total_return := inv.amount + profit;

        -- Update investment to completed status
        UPDATE public.demo_investments 
        SET status = 'completed', is_credited = true 
        WHERE id = inv.id;

        -- Update the user's demo wallet balance cumulatively
        UPDATE public.profiles 
        SET demo_balance = COALESCE(demo_balance, 0) + total_return 
        WHERE id = inv.user_id;

        v_processed := v_processed + 1;
        v_total_credited := v_total_credited + total_return;
    END LOOP;

    RETURN QUERY SELECT v_processed, v_total_credited;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
