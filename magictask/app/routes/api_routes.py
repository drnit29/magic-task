from flask import Blueprint, jsonify, request
from app.models import task_model
import uuid
from datetime import datetime

# Use 'bp' or 'api_bp' as the Blueprint name for consistency
bp = Blueprint('api_routes', __name__) # Changed from 'api' to 'api_routes' for clarity

@bp.route('/tasks', methods=['GET'])
def get_tasks():
    try:
        data = task_model.load_data()
        tasks = data.get('tasks', [])
        return jsonify(tasks), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/tasks', methods=['POST'])
def add_task():
    try:
        new_task_data = request.json
        if not new_task_data or 'title' not in new_task_data:
            return jsonify({"error": "Task title is required"}), 400

        data = task_model.load_data()
        tasks = data.get('tasks', [])

        task_id = uuid.uuid4().hex
        task = {
            "id": task_id,
            "title": new_task_data['title'],
            "urgency": new_task_data.get('urgency', 0), # Default to normal
            "effort": new_task_data.get('effort', 1),   # Default to effort 1
            "completed": False,
            "created_at": datetime.utcnow().isoformat() + "Z", # Ensure ISO 8601 format with Z
            "completed_at": None,
            "subtasks": [],
            "collapsed": False
        }
        tasks.append(task)
        data['tasks'] = tasks
        task_model.save_data(data)
        
        return jsonify(task), 201
    except Exception as e:
        # Log the exception e for debugging
        print(f"Error in add_task: {e}")
        return jsonify({"error": "An internal error occurred"}), 500

# Placeholder for other API routes to be added later
# GET  /api/tasks/{id}
# PUT  /api/tasks/{id}
# DELETE /api/tasks/{id}
# etc.

@bp.route('/tasks/<string:task_id>', methods=['GET'])
def get_task(task_id):
    task = task_model.get_task_by_id(task_id)
    if task:
        return jsonify(task), 200
    return jsonify({"error": "Task not found"}), 404

@bp.route('/tasks/<string:task_id>', methods=['PUT'])
def update_task(task_id):
    updates = request.json
    if not updates:
        return jsonify({"error": "No update data provided"}), 400

    # Filter for allowed update fields before passing to model function
    allowed_updates = {}
    if 'title' in updates:
        allowed_updates['title'] = updates['title']
    if 'urgency' in updates:
        # Basic validation example, can be expanded
        if not isinstance(updates['urgency'], int) or updates['urgency'] not in [0, 1]:
            return jsonify({"error": "Invalid urgency value"}), 400
        allowed_updates['urgency'] = updates['urgency']
    if 'effort' in updates:
        if not isinstance(updates['effort'], int) or not (1 <= updates['effort'] <= 3):
            return jsonify({"error": "Invalid effort value"}), 400
        allowed_updates['effort'] = updates['effort']
    if 'collapsed' in updates:
        if not isinstance(updates['collapsed'], bool):
            return jsonify({"error": "Invalid collapsed value"}), 400
        allowed_updates['collapsed'] = updates['collapsed']


    if not allowed_updates:
         return jsonify({"error": "No valid fields to update provided"}), 400

    updated_task = task_model.update_task_by_id(task_id, allowed_updates)
    
    if updated_task:
        return jsonify(updated_task), 200
    return jsonify({"error": "Task not found or update failed"}), 404

@bp.route('/tasks/<string:task_id>', methods=['DELETE'])
def delete_task(task_id):
    if task_model.delete_task_by_id(task_id):
        return jsonify({"message": "Task deleted"}), 200
    return jsonify({"error": "Task not found"}), 404

# POST /api/tasks/{task_id}/subtasks    # Add a subtask
# PUT  /api/tasks/{task_id}/subtasks/{subtask_id}    # Update a subtask
# DELETE /api/tasks/{task_id}/subtasks/{subtask_id}  # Delete a subtask

@bp.route('/tasks/<string:task_id>/subtasks', methods=['POST'])
def add_subtask_route(task_id):
    subtask_data = request.json
    if not subtask_data or 'title' not in subtask_data or not subtask_data['title'].strip():
        return jsonify({"error": "Subtask title is required"}), 400

    new_subtask = task_model.add_subtask_to_task(task_id, subtask_data)
    if new_subtask:
        return jsonify(new_subtask), 201
    return jsonify({"error": "Parent task not found or failed to add subtask"}), 404

@bp.route('/tasks/<string:task_id>/subtasks/<string:subtask_id>', methods=['PUT'])
def update_subtask_route(task_id, subtask_id):
    updates = request.json
    if not updates:
        return jsonify({"error": "No update data provided"}), 400
    
    # Basic validation for 'completed' field if present
    if 'completed' in updates and not isinstance(updates['completed'], bool):
        return jsonify({"error": "Invalid 'completed' status"}), 400
    if 'title' in updates and (updates['title'] is None or not updates['title'].strip()):
        return jsonify({"error": "Title cannot be empty"}), 400


    updated_subtask = task_model.update_subtask_in_task(task_id, subtask_id, updates)
    if updated_subtask:
        return jsonify(updated_subtask), 200
    return jsonify({"error": "Parent task or subtask not found, or update failed"}), 404

@bp.route('/tasks/<string:task_id>/subtasks/<string:subtask_id>', methods=['DELETE'])
def delete_subtask_route(task_id, subtask_id):
    if task_model.delete_subtask_from_task(task_id, subtask_id):
        return jsonify({"message": "Subtask deleted"}), 200
    return jsonify({"error": "Parent task or subtask not found, or delete failed"}), 404

@bp.route('/tasks/<string:task_id>/complete', methods=['PUT'])
def complete_task_route(task_id):
    updated_task = task_model.set_task_completion_status(task_id, True)
    if updated_task:
        return jsonify(updated_task), 200
    return jsonify({"error": "Task not found or failed to update"}), 404

# --- App State API Routes ---

@bp.route('/state', methods=['GET'])
def get_state_route():
    try:
        state = task_model.get_app_state()
        return jsonify(state), 200
    except Exception as e:
        # Log error e
        print(f"Error in get_state_route: {e}")
        return jsonify({"error": "Failed to retrieve application state"}), 500

@bp.route('/state', methods=['PUT'])
def update_state_route():
    update_data = request.json
    if not isinstance(update_data, dict):
        return jsonify({"error": "Invalid request data: must be a JSON object"}), 400
    
    try:
        updated_state = task_model.update_app_state(update_data)
        if updated_state is None: # Should not happen if update_app_state handles errors well
            return jsonify({"error": "Failed to update application state, data might be invalid"}), 400
        return jsonify(updated_state), 200
    except Exception as e:
        # Log error e
        print(f"Error in update_state_route: {e}")
        return jsonify({"error": "An internal error occurred while updating state"}), 500

@bp.route('/tasks/<string:task_id>/uncomplete', methods=['PUT'])
def uncomplete_task_route(task_id):
    updated_task = task_model.set_task_completion_status(task_id, False)
    if updated_task:
        return jsonify(updated_task), 200
    return jsonify({"error": "Task not found or failed to update"}), 404
