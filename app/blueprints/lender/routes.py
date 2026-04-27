from flask import render_template, request, redirect, url_for, session, flash, abort
from . import lender_bp
from utils.db import get_db, query, execute
from utils.decorators import lender_required


# ── Dashboard ─────────────────────────────────────────────
@lender_bp.route('/dashboard')
@lender_required
def dashboard():
    lender = query('SELECT * FROM lenders WHERE user_id = %s', (session['user_id'],), one=True)
    return render_template('lender/dashboard.html', lender=lender)


# ── Deposit Funds ──────────────────────────────────────────
@lender_bp.route('/deposit', methods=['GET', 'POST'])
@lender_required
def deposit():
    user_id = session['user_id']
    lender = query('SELECT * FROM lenders WHERE user_id = %s', (user_id,), one=True)

    if request.method == 'POST':
        try:
            amount = float(request.form.get('amount', 0))
            if amount <= 0:
                flash('Please enter a positive amount.', 'error')
                return render_template('lender/deposit.html', lender=lender)

            method      = request.form.get('method', 'bank_transfer')
            new_balance = float(lender['available_balance']) + amount
            new_total   = float(lender['total_deposited']) + amount

            db = get_db()
            cursor = db.cursor()
            try:
                cursor.execute("""
                    UPDATE lenders
                    SET available_balance = %s, total_deposited = %s
                    WHERE user_id = %s
                """, (new_balance, new_total, user_id))

                cursor.execute("""
                    INSERT INTO transactions
                        (user_id, transaction_type, amount, reference_type, balance_after, description)
                    VALUES (%s, 'deposit', %s, 'deposit', %s, %s)
                """, (user_id, amount, new_balance,
                      f'Deposit via {method.replace("_", " ").title()}'))

                db.commit()
                flash(f'€{amount:,.2f} deposited. New balance: €{new_balance:,.2f}.', 'success')
                return redirect(url_for('lender.dashboard'))
            except Exception:
                db.rollback()
                flash('Deposit failed. Please try again.', 'error')
            finally:
                cursor.close()

        except (ValueError, TypeError):
            flash('Please enter a valid deposit amount.', 'error')

    return render_template('lender/deposit.html', lender=lender)


# ── Browse Community Borrowers ─────────────────────────────
@lender_bp.route('/borrowers')
@lender_required
def borrowers():
    community_id = session['community_id']

    # Optional filters from query string
    min_score = request.args.get('min_score', type=int, default=0)
    purpose   = request.args.get('purpose', '')

    sql = """
        SELECT lr.request_id, lr.amount, lr.purpose, lr.duration_months, lr.created_at,
               b.borrower_id, b.credibility_score, b.on_time_payments,
               b.completed_loans, b.defaulted_loans,
               up.full_name
        FROM loan_requests lr
        JOIN borrowers b   ON lr.borrower_id = b.borrower_id
        JOIN users u       ON b.user_id = u.user_id
        JOIN user_profile up ON u.user_id = up.user_id
        WHERE lr.community_id = %s
          AND lr.status = 'active'
          AND b.credibility_score >= %s
    """
    params = [community_id, min_score]

    if purpose:
        sql += ' AND lr.purpose = %s'
        params.append(purpose)

    sql += ' ORDER BY b.credibility_score DESC'

    loan_requests = query(sql, params)
    return render_template('lender/borrowers.html',
                           loan_requests=loan_requests,
                           min_score=min_score, purpose=purpose)


# ── Borrower Profile (lender view) ────────────────────────
@lender_bp.route('/borrower/<int:borrower_id>')
@lender_required
def borrower_profile(borrower_id):
    community_id = session['community_id']

    borrower = query("""
        SELECT b.*, up.full_name, u.community_id, u.created_at AS member_since
        FROM borrowers b
        JOIN users u       ON b.user_id = u.user_id
        JOIN user_profile up ON u.user_id = up.user_id
        WHERE b.borrower_id = %s AND u.community_id = %s
    """, (borrower_id, community_id), one=True)

    if not borrower:
        abort(404)

    assessment = query(
        'SELECT * FROM borrower_assessments WHERE borrower_id = %s ORDER BY created_at DESC LIMIT 1',
        (borrower_id,), one=True
    )

    loan_request = query(
        "SELECT * FROM loan_requests WHERE borrower_id = %s AND status = 'active'"
        " ORDER BY created_at DESC LIMIT 1",
        (borrower_id,), one=True
    )

    from blueprints.borrower.scoring import score_label
    label = score_label(borrower['credibility_score'])

    return render_template('lender/borrower_profile.html',
                           borrower=borrower, assessment=assessment,
                           loan_request=loan_request, label=label)


# ── Lender Account Page ────────────────────────────────────
@lender_bp.route('/account')
@lender_required
def account():
    user_id = session['user_id']
    lender       = query('SELECT * FROM lenders WHERE user_id = %s', (user_id,), one=True)
    user         = query('SELECT email, created_at FROM users WHERE user_id = %s', (user_id,), one=True)
    profile      = query('SELECT * FROM user_profile WHERE user_id = %s', (user_id,), one=True)
    transactions = query("""
        SELECT * FROM transactions WHERE user_id = %s
        ORDER BY created_at DESC LIMIT 10
    """, (user_id,))
    return render_template('lender/account.html',
                           lender=lender, user=user,
                           profile=profile, transactions=transactions)
