from pathlib import Path
from flask import Flask, jsonify, render_template, send_from_directory
from flask_cors import CORS

from app.config import config_by_name, STATIC_PATH


def create_app(config_name):
    app = Flask(__name__, instance_relative_config=True, static_folder=STATIC_PATH)
    CORS(app=app)

    app.config.from_object(config_by_name[config_name])

    from app.api import ppeditor, molecules
    app.register_blueprint(ppeditor.bp)
    app.register_blueprint(molecules.bp)


    @app.route('/', methods=(['GET']))
    def status():
        response = {
            "status": True,
            "message": "ppeditor API is running..."
        }
        return jsonify(response)
    
    @app.route('/download/<path:filename>')
    def download(filename):
        directory = app.config['UPLOAD_FOLDER']
            
        return send_from_directory(directory, filename, as_attachment=False)
  

    return app 