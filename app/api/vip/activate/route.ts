
-- =====================================================
-- STORE GAMING: REGISTRO DE PAGOS VIP
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vip_membership_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL UNIQUE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    balance_before NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL,
    vip_started_at TIMESTAMPTZ NOT NULL,
    vip_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT vip_dates_valid CHECK (vip_expires_at > vip_started_at)
);

ALTER TABLE public.vip_membership_payments
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.vip_membership_payments
FROM PUBLIC, anon, authenticated;

-- =====================================================
-- FUNCIÓN SEGURA DE ACTIVACIÓN Y RENOVACIÓN VIP
-- =====================================================

CREATE OR REPLACE FUNCTION public.store_gaming_activate_vip(
    p_user_id UUID,
    p_idempotency_key TEXT
)
RETURNS TABLE (
    payment_id UUID,
    vip_started_at TIMESTAMPTZ,
    vip_expires_at TIMESTAMPTZ,
    balance NUMERIC,
    created BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_existing public.vip_membership_payments%ROWTYPE;
    v_balance NUMERIC;
    v_balance_after NUMERIC;
    v_started TIMESTAMPTZ;
    v_expires TIMESTAMPTZ;
    v_now TIMESTAMPTZ;
    v_payment_id UUID;
    v_key TEXT;
    v_old_started TIMESTAMPTZ;
    v_old_expires TIMESTAMPTZ;
BEGIN
    v_key := pg_catalog.btrim(p_idempotency_key);

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'USER_ID_REQUIRED';
    END IF;

    IF v_key IS NULL OR v_key = '' OR pg_catalog.length(v_key) > 200 THEN
        RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY';
    END IF;

    -- Evitar procesar dos veces la misma solicitud.
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(v_key, 0)
    );

    SELECT p.*
    INTO v_existing
    FROM public.vip_membership_payments AS p
    WHERE p.idempotency_key = v_key
    FOR UPDATE;

    IF FOUND THEN
        IF v_existing.user_id IS DISTINCT FROM p_user_id THEN
            RAISE EXCEPTION 'IDEMPOTENCY_KEY_ALREADY_USED';
        END IF;

        RETURN QUERY
        SELECT
            v_existing.id,
            v_existing.vip_started_at,
            v_existing.vip_expires_at,
            v_existing.balance_after,
            false;
        RETURN;
    END IF;

    -- Bloquear el perfil para evitar descuentos concurrentes.
    SELECT
        COALESCE(p.balance, 0),
        p.vip_started_at,
        p.vip_expires_at
    INTO
        v_balance,
        v_old_started,
        v_old_expires
    FROM public.profiles AS p
    WHERE p.id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PROFILE_NOT_FOUND';
    END IF;

    v_now := pg_catalog.clock_timestamp();

    IF v_balance < 5.00 THEN
        RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
    END IF;

    -- Si el VIP sigue activo, extender el vencimiento.
    -- Si venció, comenzar un período nuevo.
    IF v_old_expires IS NOT NULL AND v_old_expires > v_now THEN
        v_started := COALESCE(v_old_started, v_now);
        v_expires := v_old_expires + INTERVAL '30 days';
    ELSE
        v_started := v_now;
        v_expires := v_now + INTERVAL '30 days';
    END IF;

    v_balance_after := v_balance - 5.00;

    -- Actualizar balance y membresía.
    UPDATE public.profiles
    SET
        balance = v_balance_after,
        vip_started_at = v_started,
        vip_expires_at = v_expires
    WHERE id = p_user_id;

    -- Guardar el pago y la clave única.
    INSERT INTO public.vip_membership_payments (
        user_id,
        idempotency_key,
        amount,
        balance_before,
        balance_after,
        vip_started_at,
        vip_expires_at
    )
    VALUES (
        p_user_id,
        v_key,
        5.00,
        v_balance,
        v_balance_after,
        v_started,
        v_expires
    )
    RETURNING id INTO v_payment_id;

    -- Registrar el movimiento en el historial existente.
    INSERT INTO public.transactions (
        user_id,
        type,
        amount,
        balance_before,
        balance_after,
        description
    )
    VALUES (
        p_user_id,
        'VIP_MEMBERSHIP',
        5.00,
        v_balance,
        v_balance_after,
        'Activación o renovación de membresía VIP por 30 días'
    );

    RETURN QUERY
    SELECT
        v_payment_id,
        v_started,
        v_expires,
        v_balance_after,
        true;
END;
$function$;

-- Solo el servidor con service_role podrá ejecutar esta función.
REVOKE ALL ON FUNCTION public.store_gaming_activate_vip(UUID, TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.store_gaming_activate_vip(UUID, TEXT)
TO service_role;
