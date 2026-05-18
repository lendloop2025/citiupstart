DO $$
DECLARE
    v_community UUID;
    v_smruti UUID := 'a209bf14-188d-4966-9848-466faa99ac17';
    v_umer   UUID := 'd81f3a89-70b8-4dd1-b713-67abedf09241';
BEGIN
    SELECT id INTO v_community FROM public.communities WHERE slug = 'nci';

    -- Smruti: admin role + lender, pre-verified
    INSERT INTO public.users (
        id, community_id, email, role, status,
        first_name, last_name, date_of_birth, gender,
        mobile_e164, address_line1, city, postal_code, country,
        totp_enabled, identity_verified_at, identity_verification_method,
        nci_program, nci_year, is_part_time_employed, welcome_bonus_active_until
    ) VALUES (
        v_smruti, v_community, 'x24269522@student.ncirl.ie',
        'admin', 'verified',
        'Smruti', 'Patil', '2000-03-15', 'female',
        '+353871234001',
        '14 Mayor Street Lower', 'Dublin', 'D01 F5P2', 'IE',
        TRUE, now(), 'manual_admin',
        'MSc Data Analytics', 1, TRUE, now() + INTERVAL '90 days'
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'admin',
        status = 'verified',
        identity_verified_at = COALESCE(public.users.identity_verified_at, now());

    -- Umer: borrower, pre-verified
    INSERT INTO public.users (
        id, community_id, email, role, status,
        first_name, last_name, date_of_birth, gender,
        mobile_e164, address_line1, city, postal_code, country,
        totp_enabled, identity_verified_at, identity_verification_method,
        nci_program, nci_year, is_part_time_employed, welcome_bonus_active_until
    ) VALUES (
        v_umer, v_community, 'x24197432@student.ncirl.ie',
        'member', 'verified',
        'Umer', 'Khan', '1999-08-22', 'male',
        '+353871234002',
        '7 Pearse Street', 'Dublin', 'D02 RX01', 'IE',
        TRUE, now(), 'manual_admin',
        'MSc Cloud Computing', 1, TRUE, now() + INTERVAL '90 days'
    )
    ON CONFLICT (id) DO UPDATE SET
        status = 'verified',
        identity_verified_at = COALESCE(public.users.identity_verified_at, now());

    -- Pre-fund Smruti with €500
    PERFORM public.credit_wallet_atomic(
        v_smruti, 50000, 'deposit_cleared',
        NULL, NULL, 'Pre-demo deposit'
    );

    -- Borrower assessment for Umer
    INSERT INTO public.borrower_assessments (
        user_id, community_id,
        monthly_income_cents, monthly_expenses_cents, existing_debt_cents,
        employment_status, employment_months, has_emergency_fund,
        verified_income_cents, income_verification_method,
        nci_semesters_completed, has_irp, irp_expiry_date
    ) VALUES (
        v_umer, v_community,
        120000, 75000, 0,
        'part_time', 4, FALSE,
        120000, 'payslip_admin',
        1, TRUE, '2027-09-30'
    );

    -- Initial credit score for Umer (72/100)
    INSERT INTO public.credit_scores (
        user_id, community_id, total_score,
        identity_score, income_score, stability_score, financial_score, reputation_score,
        breakdown, algorithm_version
    ) VALUES (
        v_umer, v_community, 72,
        18, 17, 8, 19, 10,
        '{"identity_verified":{"points":8,"max":8,"reason":"Identity documents approved"}}'::jsonb,
        'v1.0'
    );
END $$;