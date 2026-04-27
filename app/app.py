from flask import Flask, render_template
from config import Config
from utils.db import close_db


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    app.teardown_appcontext(close_db)

    from blueprints.core import core_bp
    from blueprints.auth import auth_bp
    from blueprints.lender import lender_bp
    from blueprints.borrower import borrower_bp

    app.register_blueprint(core_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(lender_bp, url_prefix='/lender')
    app.register_blueprint(borrower_bp, url_prefix='/borrower')

    @app.errorhandler(403)
    def forbidden(e):
        return render_template('errors/403.html'), 403

    @app.errorhandler(404)
    def not_found(e):
        return render_template('errors/404.html'), 404

    @app.errorhandler(500)
    def server_error(e):
        return render_template('errors/500.html'), 500

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
