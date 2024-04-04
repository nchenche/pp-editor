import os
import app

application = app.create_app(config_name=os.getenv('FLASK_ENV', 'production'))


if __name__ == '__main__':
    application.run(host='0.0.0.0', port=5000, debug=True)