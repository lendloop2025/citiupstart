from flask import render_template, request, redirect, url_for, session, flash, abort
from . import borrower_bp
from utils.db import get_db, query, execute
from utils.decorators import borrower_required
from .scoring import calculate_credibility_score, score_label


# ── Dashboard ─────────────────────────────────────────────
@borrower_bp.route('/dashboard')
@borrower_required
def dashboard():
    user_id = session['user_id']
    borrower = query('SELECT * FROM borrowers WHERE user_id = %s', (user_id,), one=True)
    active_request = None
    if borrower:
        active_request = query(
            "SELECT * FROM loan_requests WHERE borrower_id = %s AND status = 'active'"
            " ORDER BY created_at DESC LIMIT 1",
            (borrower['borrower_id'],), one=True
        )
    return render_template('borrower/dashboard.html', borrower=borrower, active_request=active_request)


# ── Credibility Assessment ─────────────────────────────────
@borrower_bp.route('/assessment', methods=['GET', 'POST'])
@borrower_required
def assessment():
    user_id = session['user_id']
    borrower = query('SELECT * FROM borrowers WHERE user_id = %s', (user_id,), one=True)
    user    = query('SELECT email FROM users WHERE user_id = %s', (user_id,), one=True)
    profile = query('SELECT * FROM user_profile WHERE user_id = %s', (user_id,), one=True)

    existing = query(
        'SELECT * FROM borrower_assessments WHERE borrower_id = %s'
        ' ORDER BY created_at DESC LIMIT 1',
        (borrower['borrower_id'],), one=True
    ) if borrower else None

    if request.method == 'POST':
        f = request.form

        def si(key, default=None):
            try: return int(f.get(key)) if f.get(key) else default
            except (ValueError, TypeError): return default

        def sf(key, default=None):
            try: return float(f.get(key)) if f.get(key) else default
            except (ValueError, TypeError): return default

        data = {
            'full_name':                f.get('full_name', '').strip() or None,
            'date_of_birth':            f.get('date_of_birth') or None,
            'email':                    user['email'],
            'phone':                    f.get('phone', '').strip() or None,
            'current_address':          f.get('current_address', '').strip() or None,
            'years_at_address':         si('years_at_address', 0),
            'id_type':                  f.get('id_type') or None,
            'id_number':                f.get('id_number', '').strip() or None,
            'id_expiry':                f.get('id_expiry') or None,
            'employment_status':        f.get('employment_status') or None,
            'company_name':             f.get('company_name', '').strip() or None,
            'job_title':                f.get('job_title', '').strip() or None,
            'years_with_employer':      si('years_with_employer'),
            'business_name':            f.get('business_name', '').strip() or None,
            'years_in_business':        si('years_in_business'),
            'salary_band':              f.get('salary_band') or None,
            'monthly_debt':             sf('monthly_debt'),
            'self_reported_credit_score': si('self_reported_credit_score'),
            'loan_purpose':             f.get('loan_purpose') or None,
            'loan_amount_needed':       sf('loan_amount_needed'),
            'preferred_duration_months': si('preferred_duration_months'),
            'reference_name':           f.get('reference_name', '').strip() or None,
            'reference_relationship':   f.get('reference_relationship', '').strip() or None,
            'reference_phone':          f.get('reference_phone', '').strip() or None,
        }

        errors = []
        if not data['id_type']:          errors.append('Please select your Government ID type.')
        if not data['employment_status']: errors.append('Please select your employment status.')
        if not data['loan_purpose']:     errors.append('Please select a loan purpose.')

        if errors:
            for e in errors:
                flash(e, 'error')
            return render_template('borrower/assessment_form.html', form=data, profile=profile)

        score = calculate_credibility_score(data, borrower['borrower_id'])

        db = get_db()
        cursor = db.cursor()
        try:
            vals = (
                data['full_name'], data['date_of_birth'], data['email'], data['phone'],
                data['current_address'], data['years_at_address'],
                data['id_type'], data['id_number'], data['id_expiry'],
                data['employment_status'], data['company_name'], data['job_title'],
                data['years_with_employer'], data['business_name'], data['years_in_business'],
                data['salary_band'], data['monthly_debt'], data['self_reported_credit_score'],
                data['loan_purpose'], data['loan_amount_needed'], data['preferred_duration_months'],
                data['reference_name'], data['reference_relationship'], data['reference_phone'],
                score['total'],
                score['breakdown']['identity'], score['breakdown']['financial'],
                score['breakdown']['credit_history'], score['breakdown']['stability'],
                score['breakdown']['reputation'],
            )

            if existing:
                cursor.execute("""
                    UPDATE borrower_assessments SET
                        full_name=%s, date_of_birth=%s, email=%s, phone=%s,
                        current_address=%s, years_at_address=%s,
                        id_type=%s, id_number=%s, id_expiry=%s,
                        employment_status=%s, company_name=%s, job_title=%s, years_with_employer=%s,
                        business_name=%s, years_in_business=%s,
                        salary_band=%s, monthly_debt=%s, self_reported_credit_score=%s,
                        loan_purpose=%s, loan_amount_needed=%s, preferred_duration_months=%s,
                        reference_name=%s, reference_relationship=%s, reference_phone=%s,
                        score_total=%s, score_identity=%s, score_financial=%s,
                        score_credit_history=%s, score_stability=%s, score_reputation=%s
                    WHERE borrower_id=%s
                """, vals + (borrower['borrower_id'],))
            else:
                cursor.execute("""
                    INSERT INTO borrower_assessments (
                        borrower_id,
                        full_name, date_of_birth, email, phone,
                        current_address, years_at_address,
                        id_type, id_number, id_expiry,
                        employment_status, company_name, job_title, years_with_employer,
                        business_name, years_in_business,
                        salary_band, monthly_debt, self_reported_credit_score,
                        loan_purpose, loan_amount_needed, preferred_duration_months,
                        reference_name, reference_relationship, reference_phone,
                        score_total, score_identity, score_financial,
                        score_credit_history, score_stability, score_reputation
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (borrower['borrower_id'],) + vals)

            cursor.execute("""
                UPDATE borrowers SET
                    credibility_score=%s,
                    identity_verification_score=%s,
                    financial_strength_score=%s,
                    credit_history_score=%s,
                    stability_score=%s,
                    platform_reputation_score=%s
                WHERE borrower_id=%s
            """, (
                score['total'],
                score['breakdown']['identity'],   score['breakdown']['financial'],
                score['breakdown']['credit_history'], score['breakdown']['stability'],
                score['breakdown']['reputation'],
                borrower['borrower_id']
            ))

            db.commit()
            flash(f"Assessment saved. Your credibility score is {score['total']}/100.", 'success')
            return redirect(url_for('borrower.assessment_view'))

        except Exception:
            db.rollback()
            flash('Something went wrong saving your assessment. Please try again.', 'error')
            return render_template('borrower/assessment_form.html', form=data, profile=profile)
        finally:
            cursor.close()

    form_data = dict(existing) if existing else {}
    return render_template('borrower/assessment_form.html', form=form_data, profile=profile)


@borrower_bp.route('/assessment/view')
@borrower_required
def assessment_view():
    user_id = session['user_id']
    borrower = query('SELECT * FROM borrowers WHERE user_id = %s', (user_id,), one=True)

    if not borrower or borrower['credibility_score'] == 0:
        flash("Complete your credibility assessment first.", 'warning')
        return redirect(url_for('borrower.assessment'))

    assessment = query(
        'SELECT * FROM borrower_assessments WHERE borrower_id = %s ORDER BY created_at DESC LIMIT 1',
        (borrower['borrower_id'],), one=True
    )
    label = score_label(borrower['credibility_score'])
    return render_template('borrower/assessment_view.html',
                           borrower=borrower, assessment=assessment, label=label)


# ── Loan Request ───────────────────────────────────────────
@borrower_bp.route('/request/new', methods=['GET', 'POST'])
@borrower_required
def new_request():
    user_id = session['user_id']
    borrower = query('SELECT * FROM borrowers WHERE user_id = %s', (user_id,), one=True)

    if not borrower or borrower['credibility_score'] == 0:
        flash('Complete your credibility assessment before posting a loan request.', 'warning')
        return redirect(url_for('borrower.assessment'))

    if request.method == 'POST':
        try:
            amount   = float(request.form.get('amount', 0))
            duration = int(request.form.get('duration_months', 0))
            purpose  = request.form.get('purpose', '').strip()
            notes    = request.form.get('additional_notes', '').strip()[:500]
            method   = request.form.get('receive_method', 'platform_wallet')

            if amount <= 0 or duration <= 0 or not purpose:
                flash('Please fill in all required fields with valid values.', 'error')
                return render_template('borrower/request_form.html', borrower=borrower)

            execute("""
                INSERT INTO loan_requests
                    (borrower_id, community_id, amount, purpose,
                     additional_notes, duration_months, receive_method)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (borrower['borrower_id'], session['community_id'],
                  amount, purpose, notes, duration, method))

            flash('Your loan request is live. Lenders in your community can now see it.', 'success')
            return redirect(url_for('borrower.dashboard'))

        except (ValueError, TypeError):
            flash('Please enter a valid loan amount.', 'error')
        except Exception:
            flash('Something went wrong. Please try again.', 'error')

    return render_template('borrower/request_form.html', borrower=borrower)


# ── Browse Lenders ─────────────────────────────────────────
@borrower_bp.route('/lenders')
@borrower_required
def lenders():
    community_id = session['community_id']
    lenders_list = query("""
        SELECT l.lender_id, l.total_loans_given, l.completed_loans, l.active_loans,
               FLOOR(l.available_balance / 100) * 100 AS balance_display,
               up.full_name
        FROM lenders l
        JOIN users u ON l.user_id = u.user_id
        JOIN user_profile up ON u.user_id = up.user_id
        WHERE u.community_id = %s AND l.available_balance > 0
        ORDER BY l.available_balance DESC
    """, (community_id,))
    return render_template('borrower/lenders.html', lenders=lenders_list)
