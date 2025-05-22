from flask import Blueprint, render_template

# Use 'bp' or 'main_bp' as the Blueprint name for consistency
bp = Blueprint('main_routes', __name__)

@bp.route('/', methods=['GET'])
def index():
    """Serves the main page of the application."""
    return render_template('index.html')

# Add other main page routes here if needed in the future
# For example, an about page or help page
# @bp.route('/about')
# def about():
#     return render_template('about.html')

@bp.route('/focus')
def focus_mode_page():
    # Serves the focus mode page.
    return render_template('focus_mode.html')
