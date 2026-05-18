from flask import render_template
from . import core_bp


@core_bp.route('/')
def landing():
    return render_template('core/landing.html')
