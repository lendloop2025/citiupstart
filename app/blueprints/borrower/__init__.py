from flask import Blueprint

borrower_bp = Blueprint('borrower', __name__)

from . import routes  # noqa: F401, E402
