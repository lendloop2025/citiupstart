import bcrypt
from flask import render_template, request, redirect, url_for, session, flash
from . import auth_bp
from utils.db import get_db, query, execute


@auth_bp.route('/signup', methods=['GET', 'POST'])
def signup():
    if 'user_id' in session:
        return _redirect_by_role()

    communities = query(
        'SELECT community_id, community_name FROM communities WHERE is_active = 1'
    )

    if request.method == 'POST':
        full_name = request.form.get('full_name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        role = request.form.get('role', '')
        community_id = request.form.get('community_id', '')

        errors = _validate_signup(full_name, email, password, confirm_password, role, community_id)

        if not errors:
            existing = query('SELECT user_id FROM users WHERE email = %s', (email,), one=True)
            if existing:
                errors.append('An account with this email already exists.')

        if errors:
            for error in errors:
                flash(error, 'error')
            return render_template('auth/signup.html', communities=communities)

        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        db = get_db()
        cursor = db.cursor()
        try:
            cursor.execute(
                'INSERT INTO users (community_id, email, password_hash, role) VALUES (%s, %s, %s, %s)',
                (int(community_id), email, password_hash, role)
            )
            user_id = cursor.lastrowid

            cursor.execute(
                'INSERT INTO user_profile (user_id, full_name) VALUES (%s, %s)',
                (user_id, full_name)
            )

            if role == 'lender':
                cursor.execute('INSERT INTO lenders (user_id) VALUES (%s)', (user_id,))
            else:
                # credit_history_score baseline = 10: unknown ≠ bad
                cursor.execute(
                    'INSERT INTO borrowers (user_id, credit_history_score) VALUES (%s, %s)',
                    (user_id, 10)
                )

            db.commit()

            session.clear()
            session['user_id'] = user_id
            session['role'] = role
            session['community_id'] = int(community_id)
            session['full_name'] = full_name

            flash(f'Welcome to 121.ai, {full_name.split()[0]}!', 'success')
            return _redirect_by_role()

        except Exception:
            db.rollback()
            flash('Something went wrong. Please try again.', 'error')
            return render_template('auth/signup.html', communities=communities)
        finally:
            cursor.close()

    return render_template('auth/signup.html', communities=communities)


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return _redirect_by_role()

    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')

        if not email or not password:
            flash('Please enter your email and password.', 'error')
            return render_template('auth/login.html')

        user = query(
            '''SELECT u.user_id, u.password_hash, u.role, u.community_id, u.is_active,
                      up.full_name
               FROM users u
               JOIN user_profile up ON u.user_id = up.user_id
               WHERE u.email = %s''',
            (email,), one=True
        )

        if not user or not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            flash('Invalid email or password.', 'error')
            return render_template('auth/login.html')

        if not user['is_active']:
            flash('Your account is inactive. Please contact support.', 'error')
            return render_template('auth/login.html')

        execute('UPDATE users SET last_login = NOW() WHERE user_id = %s', (user['user_id'],))

        session.clear()
        session['user_id'] = user['user_id']
        session['role'] = user['role']
        session['community_id'] = user['community_id']
        session['full_name'] = user['full_name']

        return _redirect_by_role()

    return render_template('auth/login.html')


@auth_bp.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('auth.login'))


def _redirect_by_role():
    if session.get('role') == 'lender':
        return redirect(url_for('lender.dashboard'))
    return redirect(url_for('borrower.dashboard'))


def _validate_signup(full_name, email, password, confirm_password, role, community_id):
    errors = []
    if not full_name:
        errors.append('Full name is required.')
    if not email or '@' not in email:
        errors.append('A valid email address is required.')
    if len(password) < 8:
        errors.append('Password must be at least 8 characters.')
    if password != confirm_password:
        errors.append('Passwords do not match.')
    if role not in ('lender', 'borrower'):
        errors.append('Please select a role — Lender or Borrower.')
    if not community_id:
        errors.append('Please select a community.')
    return errors
