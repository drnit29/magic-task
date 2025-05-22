import json
import os
import uuid
from datetime import datetime
import collections.abc # Added for deep_update

DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'tasks.json')

def load_data():
    """Loads data from the JSON file."""
    try:
        if not os.path.exists(DATA_FILE):
            # If the file doesn't exist, create it with default structure
            default_data = {"tasks": [], "app_state": {}, "templates": []}
            save_data(default_data) # This will create the file
            return default_data
        
        with open(DATA_FILE, 'r') as f:
            # Check if file is empty
            if os.path.getsize(DATA_FILE) == 0:
                default_data = {"tasks": [], "app_state": {}, "templates": []}
                save_data(default_data)
                return default_data
            data = json.load(f)
            return data
    except (IOError, json.JSONDecodeError) as e:
        print(f"Error loading data: {e}")
        # Fallback to a default structure in case of error
        return {"tasks": [], "app_state": {}, "templates": []}

def save_data(data):
    """Saves data to the JSON file."""
    try:
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)
    except IOError as e:
        print(f"Error saving data: {e}")

# Example helper functions (will be expanded later)
# def get_all_tasks():
#     data = load_data()
#     return data.get('tasks', [])

# def add_task_example(new_task_data): # Renamed to avoid confusion with API POST
#     data = load_data()
#     tasks = data.get('tasks', [])
#     # Basic example: In a real scenario, new_task_data would be a dict
#     # and you'd assign a new ID, timestamps, etc.
#     tasks.append(new_task_data) 
#     data['tasks'] = tasks
#     save_data(data)
#     return new_task_data

def get_task_by_id(task_id):
    data = load_data()
    for task in data.get('tasks', []):
        if task['id'] == task_id:
            return task
    return None

def update_task_by_id(task_id, task_updates):
    data = load_data()
    tasks = data.get('tasks', [])
    task_found = False
    updated_task = None
    for i, task in enumerate(tasks):
        if task['id'] == task_id:
            # Only update allowed fields
            if 'title' in task_updates:
                task['title'] = task_updates['title']
            if 'urgency' in task_updates:
                task['urgency'] = task_updates['urgency']
            if 'effort' in task_updates:
                task['effort'] = task_updates['effort']
            # Add other updatable fields here if necessary, e.g., 'collapsed'
            if 'collapsed' in task_updates:
                 task['collapsed'] = task_updates['collapsed']

            tasks[i] = task
            updated_task = task
            task_found = True
            break
    
    if task_found:
        data['tasks'] = tasks
        save_data(data)
        return updated_task
    return None

def delete_task_by_id(task_id):
    data = load_data()
    tasks = data.get('tasks', [])
    original_length = len(tasks)
    tasks = [task for task in tasks if task['id'] != task_id]
    
    if len(tasks) < original_length:
        data['tasks'] = tasks
        save_data(data)
        return True
    return False

# --- App State Management ---

DEFAULT_APP_STATE = {
    "current_view": "active",
    "selected_task_id": None,
    "focus_mode": False,
    "pomodoro": {
        "enabled": True,
        "work_minutes": 25,
        "break_minutes": 5,
        "active": False,
        "on_break": False,
        "visible": True
    },
    "last_session": {
        "timestamp": None,
        "view": "active",
        "selected_task_id": None,
        "focus_mode": False
    },
    "settings": {
        "theme": "default",
        "keyboard_shortcuts": {
            "add_urgent_task": "Shift+1",
            "add_normal_task": "Shift+2",
            "add_subtask": "Shift+3",
            "toggle_focus_mode": "Shift+F",
            "complete_task": "Space",
            "effort_level_1": "Alt+1",
            "effort_level_2": "Alt+2",
            "effort_level_3": "Alt+3",
            "edit_task": "Shift+E",
            "delete_task": "Shift+D",
            "collapse_subtasks": "Ctrl+ArrowLeft",
            "expand_subtasks": "Ctrl+ArrowRight",
            "move_task_up": "Alt+ArrowUp",
            "move_task_down": "Alt+ArrowDown",
            "active_tasks_tab": "Alt+A",
            "completed_tasks_tab": "Alt+C",
            "toggle_pomodoro": "Shift+T",
            "access_templates": "Alt+T",
            "save_as_template": "Shift+S"
        }
    }
}

def deep_update(d, u):
    for k, v in u.items():
        if isinstance(v, collections.abc.Mapping):
            d[k] = deep_update(d.get(k, {}), v)
        else:
            d[k] = v
    return d

def get_app_state():
    """Loads data and returns the app_state dictionary."""
    data = load_data()
    # Ensure app_state exists and has a default structure if not
    if 'app_state' not in data or not isinstance(data['app_state'], dict):
        # This case should ideally not happen if tasks.json is initialized correctly
        # or if load_data ensures a default app_state upon creating a new file.
        # For robustness, return a copy of the default state.
        return DEFAULT_APP_STATE.copy() 
    
    # Basic check to see if the loaded app_state is empty, if so, return default.
    # A more thorough validation/migration could be done here if needed.
    if not data['app_state']:
        return DEFAULT_APP_STATE.copy()

    return data['app_state']

def update_app_state(new_state_data):
    """Loads current data, deep merges new_state_data into app_state, and saves."""
    if not isinstance(new_state_data, dict):
        # Or raise ValueError("Invalid state data: must be a dictionary")
        return None # Or handle error as appropriate

    data = load_data()
    
    current_app_state = data.get('app_state', DEFAULT_APP_STATE.copy())
    
    updated_state = deep_update(current_app_state, new_state_data)
    
    data['app_state'] = updated_state
    save_data(data)
    return updated_state

def set_task_completion_status(task_id, completed_status):
    data = load_data()
    tasks = data.get('tasks', [])
    task_found = False
    updated_task_obj = None

    for i, task in enumerate(tasks):
        if task['id'] == task_id:
            # Check if status is actually changing to avoid unnecessary updates
            if task['completed'] == completed_status:
                updated_task_obj = task # Return current task if no change
                task_found = True
                break

            task['completed'] = completed_status
            if completed_status:
                task['completed_at'] = datetime.utcnow().isoformat() + "Z"
            else:
                task['completed_at'] = None
            
            tasks[i] = task # Update the task in the list
            updated_task_obj = task
            task_found = True
            break
            
    if task_found:
        # Only save if there was an actual change, though current logic saves anyway if found
        # To be more precise, one could compare updated_task_obj with its original state
        # before modification if that level of optimization for writes is needed.
        # For now, saving if found and status could have changed is fine.
        data['tasks'] = tasks
        save_data(data)
        return updated_task_obj
    return None

def add_subtask_to_task(parent_task_id, subtask_data_from_request):
    data = load_data()
    tasks = data.get('tasks', [])
    parent_task_index = -1
    new_subtask_obj = None

    for i, task in enumerate(tasks):
        if task['id'] == parent_task_id:
            parent_task_index = i
            break
    
    if parent_task_index != -1:
        parent_task = tasks[parent_task_index]
        if 'subtasks' not in parent_task: # Should have been initialized
            parent_task['subtasks'] = []

        subtask_id = uuid.uuid4().hex # Unique ID for the subtask
        new_subtask_obj = {
            "id": subtask_id,
            "title": subtask_data_from_request.get('title', 'New Subtask'), # Get title from request
            "completed": False,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "completed_at": None
        }
        parent_task['subtasks'].append(new_subtask_obj)
        tasks[parent_task_index] = parent_task
        data['tasks'] = tasks
        save_data(data)
        return new_subtask_obj
    return None

def update_subtask_in_task(parent_task_id, subtask_id, subtask_updates):
    data = load_data()
    tasks = data.get('tasks', [])
    parent_task_index = -1
    subtask_index = -1
    updated_subtask_obj = None

    for i, task in enumerate(tasks):
        if task['id'] == parent_task_id:
            parent_task_index = i
            for j, subtask in enumerate(task.get('subtasks', [])):
                if subtask['id'] == subtask_id:
                    subtask_index = j
                    break
            break
            
    if parent_task_index != -1 and subtask_index != -1:
        parent_task = tasks[parent_task_index]
        subtask_to_update = parent_task['subtasks'][subtask_index]

        if 'title' in subtask_updates:
            subtask_to_update['title'] = subtask_updates['title']
        
        if 'completed' in subtask_updates:
            was_completed = subtask_to_update['completed']
            is_now_completed = subtask_updates['completed']
            if not isinstance(is_now_completed, bool): # Basic validation
                 # Or raise error / return specific error code
                pass # Let it fail for now or return None earlier
            
            subtask_to_update['completed'] = is_now_completed
            if is_now_completed and not was_completed:
                subtask_to_update['completed_at'] = datetime.utcnow().isoformat() + "Z"
            elif not is_now_completed: # If marked as not completed
                subtask_to_update['completed_at'] = None
        
        parent_task['subtasks'][subtask_index] = subtask_to_update
        tasks[parent_task_index] = parent_task
        data['tasks'] = tasks
        save_data(data)
        updated_subtask_obj = subtask_to_update
        return updated_subtask_obj
    return None

def delete_subtask_from_task(parent_task_id, subtask_id):
    data = load_data()
    tasks = data.get('tasks', [])
    parent_task_index = -1
    subtask_found_and_deleted = False

    for i, task in enumerate(tasks):
        if task['id'] == parent_task_id:
            parent_task_index = i
            original_subtasks_count = len(task.get('subtasks', []))
            task['subtasks'] = [st for st in task.get('subtasks', []) if st['id'] != subtask_id]
            if len(task['subtasks']) < original_subtasks_count:
                subtask_found_and_deleted = True
            break # Found parent task
            
    if parent_task_index != -1 and subtask_found_and_deleted:
        tasks[parent_task_index] = tasks[parent_task_index] # ensure the modified task is set
        data['tasks'] = tasks
        save_data(data)
        return True
    return False
