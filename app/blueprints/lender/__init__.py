from flask import Blueprint

lender_bp = Blueprint('lender', __name__)

from . import routes  # noqa: F401, E402
