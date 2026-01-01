from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import config
import os
from routes.appointments import appointments_bp

def create_app(config_name='development'):
    """Application factory pattern"""
    app = Flask(__name__)

    # Error handler for 422 Unprocessable Entity
    @app.errorhandler(422)
    def handle_422(error):
        import sys
        print('--- 422 ERROR ---', file=sys.stderr)
        print(error, file=sys.stderr)
        try:
            print(error.data, file=sys.stderr)
        except Exception:
            pass
        return jsonify({'error': 'Unprocessable Entity', 'message': str(error)}), 422
    
    # Load configuration
    app.config.from_object(config[config_name]) 
    
    # Initialize extensions
    CORS(app, origins=app.config['CORS_ORIGINS'], supports_credentials=True, allow_headers=["Content-Type", "Authorization"], methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    jwt = JWTManager(app)
    
    # Register blueprints (routes)
    from routes.auth import auth_bp
    from routes.chat import chat_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(appointments_bp)
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    
    # Root endpoint
    @app.route('/')
    def index():
        return jsonify({
            'message': 'Welcome to PocketCare API',
            'version': '1.0.0',
            'status': 'running'
        })
    
    # Health check endpoint
    @app.route('/health')
    def health():
        return jsonify({'status': 'healthy'}), 200
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Resource not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
