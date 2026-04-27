import mysql.connector
from flask import g, current_app


def get_db():
    if 'db' not in g:
        g.db = mysql.connector.connect(
            host=current_app.config['MYSQL_HOST'],
            user=current_app.config['MYSQL_USER'],
            password=current_app.config['MYSQL_PASSWORD'],
            database=current_app.config['MYSQL_DB'],
            port=current_app.config['MYSQL_PORT'],
            autocommit=False,
        )
    return g.db


def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def query(sql, params=(), one=False):
    """Run a SELECT, return list of row dicts (or one dict when one=True)."""
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute(sql, params)
    result = cursor.fetchone() if one else cursor.fetchall()
    cursor.close()
    return result


def execute(sql, params=()):
    """Run INSERT/UPDATE/DELETE, commit, return lastrowid."""
    db = get_db()
    cursor = db.cursor()
    cursor.execute(sql, params)
    db.commit()
    last_id = cursor.lastrowid
    cursor.close()
    return last_id
