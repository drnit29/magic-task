# magictask/app/__init__.py
from flask import Flask

def create_app():
    app = Flask(__name__)
    app.config.from_object('app.config')

    # Import and register blueprints
    from .routes import main_routes, api_routes 
    
    app.register_blueprint(main_routes.bp)
    app.register_blueprint(api_routes.bp, url_prefix='/api')

    return app
