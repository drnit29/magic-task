document.addEventListener('DOMContentLoaded', async function() { // Make async for initial fetch
    const taskListContainer = document.getElementById('task-list-container');
    const taskForm = document.getElementById('task-form'); 
    const taskTitleInput = document.getElementById('task-title'); 
    const taskUrgencyInput = document.getElementById('task-urgency');
    const taskEffortInput = document.getElementById('task-effort');
    const taskSubmitBtn = document.getElementById('task-submit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    const showActiveBtn = document.getElementById('show-active-btn');
    const showCompletedBtn = document.getElementById('show-completed-btn');
    const showAllBtn = document.getElementById('show-all-btn');

    const pomodoroTimerContainer = document.getElementById('pomodoro-timer-container'); 
    const pomodoroStateDisplay = document.getElementById('pomodoro-state');
    const pomodoroTimeDisplay = document.getElementById('pomodoro-time');
    const pomodoroStartBtn = document.getElementById('pomodoro-start-btn');
    const pomodoroPauseBtn = document.getElementById('pomodoro-pause-btn');
    const pomodoroResetBtn = document.getElementById('pomodoro-reset-btn');
    const pomodoroSkipBtn = document.getElementById('pomodoro-skip-btn');

    const startFocusModeBtn = document.getElementById('start-focus-mode-btn'); 

    let editingTaskId = null;
    let currentTasks = []; 
    let currentFilterView = 'active'; 
    let pomodoroTimer; 

    function formatDate(isoString) {
        if (!isoString) return '';
        return new Date(isoString).toLocaleString();
    }

    function formatPomodoroTime(minutes, seconds) {
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    async function updateAppState(stateUpdates) { 
        try {
            const response = await fetch('/api/state', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stateUpdates)
            });
            if (!response.ok) {
                console.error("Failed to update app state:", await response.text());
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error("Error updating app state:", error);
            return null;
        }
    }

    async function initializePomodoro() {
        try {
            const response = await fetch('/api/state');
            if (!response.ok) throw new Error('Failed to fetch app state for Pomodoro');
            const appState = await response.json();
            const pomodoroState = appState.pomodoro || {};

            pomodoroTimer = new PomodoroTimer({
                workMinutes: pomodoroState.work_minutes || 25,
                breakMinutes: pomodoroState.break_minutes || 5,
                longBreakMinutes: pomodoroState.long_break_minutes || 15,
                cyclesBeforeLongBreak: pomodoroState.cycles_before_long_break || 4,
                enabled: pomodoroState.enabled !== undefined ? pomodoroState.enabled : true,
                initialCycles: pomodoroState.cycles_completed_today || 0
            });

            pomodoroTimer.onMinuteChange = (min, sec) => {
                if (pomodoroTimeDisplay) pomodoroTimeDisplay.textContent = formatPomodoroTime(min, sec);
                const timerState = pomodoroTimer.getState();
                if (timerState.currentState === 'running') {
                     document.title = `${formatPomodoroTime(min, sec)} - ${timerState.isWorkSession ? 'Work' : 'Break'} - MagicTask`;
                } else if (timerState.currentState === 'paused') {
                     document.title = `Paused ${formatPomodoroTime(min, sec)} - MagicTask`;
                } else { document.title = 'MagicTask'; }

                // Update app_state.pomodoro.current_minutes/seconds if timer is PAUSED or IDLE
                if (timerState.currentState === 'paused' || timerState.currentState === 'idle') {
                    updateAppState({ pomodoro: { current_minutes: min, current_seconds: sec }});
                }
            };

            pomodoroTimer.onStateChange = (currentState, isWorkSession, min, sec) => {
                let stateText = 'Idle';
                if (currentState === 'running') stateText = isWorkSession ? 'Work' : 'Break';
                else if (currentState === 'paused') stateText = `Paused (${isWorkSession ? 'Work' : 'Break'})`;
                
                if (pomodoroStateDisplay) pomodoroStateDisplay.textContent = stateText;
                if (pomodoroTimeDisplay) pomodoroTimeDisplay.textContent = formatPomodoroTime(min, sec);

                if (pomodoroStartBtn) pomodoroStartBtn.disabled = (currentState === 'running' || !pomodoroTimer.config.enabled);
                if (pomodoroPauseBtn) pomodoroPauseBtn.disabled = (currentState !== 'running' || !pomodoroTimer.config.enabled);
                if (pomodoroResetBtn) pomodoroResetBtn.disabled = !pomodoroTimer.config.enabled;
                if (pomodoroSkipBtn) pomodoroSkipBtn.disabled = !pomodoroTimer.config.enabled;
                
                // Update app_state
                const stateToUpdate = {
                    pomodoro: {
                        active: currentState === 'running',
                        on_break: currentState !== 'idle' ? !isWorkSession : false, 
                        current_minutes: min,
                        current_seconds: sec
                    }
                };
                updateAppState(stateToUpdate);
            };

            pomodoroTimer.onCycleComplete = (completedSessionType, cycles) => {
                alert(completedSessionType === 'work' ? 'Work session complete! Time for a break.' : 'Break over! Time for work.');
                document.title = `Cycle Complete! - MagicTask`;
                const newTime = pomodoroTimer.getTime(); // Get time for the new idle session
                updateAppState({ pomodoro: { 
                    cycles_completed_today: cycles,
                    active: false, 
                    on_break: completedSessionType === 'work', 
                    current_minutes: newTime.minutes, 
                    current_seconds: newTime.seconds
                }});
            };

            // Initial UI setup
            if (pomodoroTimer.config.enabled) {
                // Restore minutes/seconds from app_state if timer was idle/paused
                // pomodoro.js's resetTimer sets its own defaults. We need to potentially override.
                // For now, onStateChange called below will sync the initial state FROM pomodoro.js TO backend.
                // If we wanted to restore a persisted time for an idle/paused timer:
                // if (pomodoroState.active === false && (pomodoroState.current_minutes !== undefined && pomodoroState.current_seconds !== undefined)) {
                //    pomodoroTimer.minutes = pomodoroState.current_minutes;
                //    pomodoroTimer.seconds = pomodoroState.current_seconds;
                // }
                const initialTime = pomodoroTimer.getTime(); 
                const initialState = pomodoroTimer.getState();
                // Call onStateChange to set initial UI and sync state to backend
                pomodoroTimer.onStateChange(initialState.currentState, initialState.isWorkSession, initialTime.minutes, initialTime.seconds);
            } else {
                if (pomodoroStateDisplay) pomodoroStateDisplay.textContent = "Disabled";
                if (pomodoroTimeDisplay) pomodoroTimeDisplay.textContent = formatPomodoroTime(pomodoroTimer.config.workMinutes, 0);
                document.querySelectorAll('#pomodoro-controls button').forEach(btn => btn.disabled = true);
                if (pomodoroStartBtn) pomodoroStartBtn.disabled = true; // Explicitly disable start if feature is off
            }

        } catch (error) {
            console.error("Error initializing Pomodoro timer:", error);
            if (pomodoroTimerContainer) pomodoroTimerContainer.innerHTML = "<p>Error loading Pomodoro timer. Please ensure backend is running and `app_state.pomodoro` is configured.</p>";
        }
    }
    
    // Button event listeners are now simpler, relying on onStateChange to update backend
    if (pomodoroStartBtn) pomodoroStartBtn.addEventListener('click', () => pomodoroTimer && pomodoroTimer.start());
    if (pomodoroPauseBtn) pomodoroPauseBtn.addEventListener('click', () => pomodoroTimer && pomodoroTimer.pause());
    if (pomodoroResetBtn) pomodoroResetBtn.addEventListener('click', () => pomodoroTimer && pomodoroTimer.resetTimer());
    if (pomodoroSkipBtn) {
        pomodoroSkipBtn.addEventListener('click', () => {
            if (pomodoroTimer) {
                const currentState = pomodoroTimer.getState();
                pomodoroTimer.skipTo(currentState.isWorkSession ? 'break' : 'work');
            }
        });
    }

    async function fetchAndDisplayTasks(forceFetch = false) { 
        try {
            const response = await fetch('/api/tasks'); 
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            currentTasks = await response.json(); 
            taskListContainer.innerHTML = ''; 
            let tasksToDisplay = currentTasks;
            if (currentFilterView === 'active') {
                tasksToDisplay = currentTasks.filter(task => !task.completed);
            } else if (currentFilterView === 'completed') {
                tasksToDisplay = currentTasks.filter(task => task.completed);
            }
            if (tasksToDisplay.length === 0) {
                const item = document.createElement('li');
                if (currentFilterView === 'active') item.textContent = 'No active tasks. Add one or check other views!';
                else if (currentFilterView === 'completed') item.textContent = 'No completed tasks yet.';
                else item.textContent = 'No tasks at all. Add one!';
                taskListContainer.appendChild(item);
            } else {
                tasksToDisplay.forEach(task => {
                    const listItem = document.createElement('li');
                    listItem.dataset.taskId = task.id;
                    listItem.className = task.completed ? 'task-item completed' : 'task-item';
                    const taskCompleteCheckbox = `<input type="checkbox" class="complete-task-cb" data-task-id="${task.id}" ${task.completed ? 'checked' : ''}>`;
                    let taskHTML = `
                        <div class="task-main-info">
                            ${taskCompleteCheckbox}
                            <span class="task-title">${task.title}</span>
                            ${task.urgency === 1 ? '<span class="task-urgency">(Urgent)</span>' : ''}
                            <span class="task-effort">[Effort: ${task.effort}]</span>
                            <small class="task-created-at">Created: ${formatDate(task.created_at)}</small>
                            ${task.completed ? `<small class="task-completed-at"> | Completed: ${formatDate(task.completed_at)}</small>` : ''}
                        </div>`;
                    if (task.subtasks && task.subtasks.length > 0) {
                        taskHTML += '<ul class="subtask-list">';
                        task.subtasks.forEach(subtask => {
                            const subtaskCompleteCheckbox = `<input type="checkbox" class="complete-subtask-cb" data-parent-task-id="${task.id}" data-subtask-id="${subtask.id}" ${subtask.completed ? 'checked' : ''}>`;
                            taskHTML += `
                                <li data-subtask-id="${subtask.id}" class="subtask-item ${subtask.completed ? 'completed' : ''}">
                                    ${subtaskCompleteCheckbox}
                                    <span class="subtask-title">${subtask.title}</span>
                                    <small class="subtask-created-at">Created: ${formatDate(subtask.created_at)}</small>
                                    ${subtask.completed ? `<small class="subtask-completed-at"> | Completed: ${formatDate(subtask.completed_at)}</small>` : ''}
                                </li>`;
                        });
                        taskHTML += '</ul>';
                    }
                    taskHTML += `
                        <div class="task-actions">
                            <form class="add-subtask-form" data-parent-task-id="${task.id}">
                                <input type="text" class="new-subtask-title" placeholder="Add subtask..." required>
                                <button type="submit">Add Subtask</button>
                            </form>
                            <button class="edit-task-btn" data-task-id="${task.id}">Edit</button>
                            <button class="delete-task-btn" data-task-id="${task.id}">Delete</button>
                        </div>`;
                    listItem.innerHTML = taskHTML;
                    taskListContainer.appendChild(listItem);
                });
            }
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
            const item = document.createElement('li');
            item.textContent = 'Error loading tasks.';
            item.style.color = 'red';
            taskListContainer.appendChild(item);
        }
    }
    
    function resetTaskForm() {
        taskTitleInput.value = '';
        taskUrgencyInput.checked = false;
        taskEffortInput.value = '1';
        taskSubmitBtn.textContent = 'Add Task';
        cancelEditBtn.style.display = 'none';
        editingTaskId = null;
    }

    async function handleTaskFormSubmit(event) {
        event.preventDefault();
        const title = taskTitleInput.value.trim();
        const urgency = taskUrgencyInput.checked ? 1 : 0; 
        const effort = parseInt(taskEffortInput.value, 10);
        if (!title) { alert('Task title is required.'); return; }
        if (isNaN(effort) || effort < 1 || effort > 3) { alert('Effort must be an integer between 1 and 3.'); return; }
        const taskData = { title, urgency, effort };
        try {
            let response;
            if (editingTaskId) {
                response = await fetch(`/api/tasks/${editingTaskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(taskData) });
            } else {
                response = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(taskData) });
            }
            if (!response.ok) {
                let errorMsg = `HTTP error! status: ${response.status}`;
                try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch (e) { /* ignore */ }
                throw new Error(errorMsg);
            }
            resetTaskForm();
            fetchAndDisplayTasks();
        } catch (error) { console.error('Failed to save task:', error); alert(`Failed to save task: ${error.message}`); }
    }

    taskListContainer.addEventListener('click', async function(event) {
        const target = event.target;
        const taskId = target.dataset.taskId; 
        if (target.classList.contains('delete-task-btn')) {
            if (!taskId) return;
            if (confirm('Are you sure you want to delete this task and all its subtasks?')) {
                try {
                    const response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
                    if (!response.ok) {
                         let errorMsg = `HTTP error! status: ${response.status}`;
                         try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch (e) { /* ignore */ }
                         throw new Error(errorMsg);
                    }
                    fetchAndDisplayTasks(); 
                } catch (error) { console.error('Failed to delete task:', error); alert(`Failed to delete task: ${error.message}`); }
            }
        } else if (target.classList.contains('edit-task-btn')) {
            if (!taskId) return;
            const taskToEdit = currentTasks.find(t => t.id === taskId);
            if (taskToEdit) {
                editingTaskId = taskId;
                taskTitleInput.value = taskToEdit.title;
                taskUrgencyInput.checked = taskToEdit.urgency === 1;
                taskEffortInput.value = taskToEdit.effort;
                taskSubmitBtn.textContent = 'Update Task';
                cancelEditBtn.style.display = 'inline-block'; 
                window.scrollTo(0,0); 
            }
        }
    });
    
    if(cancelEditBtn) { cancelEditBtn.addEventListener('click', function() { resetTaskForm(); }); }

    taskListContainer.addEventListener('submit', async function(event) {
        if (event.target.classList.contains('add-subtask-form')) {
            event.preventDefault();
            const form = event.target;
            const parentTaskId = form.dataset.parentTaskId;
            const subtaskTitleInput = form.querySelector('.new-subtask-title');
            const title = subtaskTitleInput.value.trim();
            if (!title) { alert('Please enter a subtask title.'); return; }
            try {
                const response = await fetch(`/api/tasks/${parentTaskId}/subtasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title }) });
                if (!response.ok) {
                    let errorMsg = `HTTP error! status: ${response.status}`;
                    try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch (e) { /* ignore */ }
                    throw new Error(errorMsg);
                }
                subtaskTitleInput.value = ''; 
                fetchAndDisplayTasks(); 
            } catch (error) { console.error('Failed to add subtask:', error); alert(`Failed to add subtask: ${error.message}`); }
        }
    });

    taskListContainer.addEventListener('change', async function(event) {
        const target = event.target;
        let response; let endpoint = ''; let body = null; let method = 'PUT';
        try {
            if (target.classList.contains('complete-task-cb')) {
                const taskId = target.dataset.taskId;
                const isCompleted = target.checked;
                endpoint = `/api/tasks/${taskId}/${isCompleted ? 'complete' : 'uncomplete'}`;
                response = await fetch(endpoint, { method });
            } else if (target.classList.contains('complete-subtask-cb')) {
                const parentTaskId = target.dataset.parentTaskId;
                const subtaskId = target.dataset.subtaskId;
                const isCompleted = target.checked;
                endpoint = `/api/tasks/${parentTaskId}/subtasks/${subtaskId}`;
                body = JSON.stringify({ completed: isCompleted });
                response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body });
            } else { return; }
            if (!response || !response.ok) {
                let errorMsg = `HTTP error! status: ${response ? response.status : 'No response'}`;
                if (response) { try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch (e) { /* ignore */ } }
                throw new Error(errorMsg);
            }
            fetchAndDisplayTasks();
        } catch (error) {
            console.error('Failed to update completion status:', error);
            alert(`Failed to update completion status: ${error.message}`);
            if (target && typeof target.checked !== 'undefined') { target.checked = !target.checked; }
        }
    });
    
    if (taskForm) { taskForm.addEventListener('submit', handleTaskFormSubmit); }

    function updateActiveButtonStates() {
        document.querySelectorAll('.view-toggle-btn').forEach(btn => btn.classList.remove('active'));
        if (currentFilterView === 'active' && showActiveBtn) showActiveBtn.classList.add('active');
        else if (currentFilterView === 'completed' && showCompletedBtn) showCompletedBtn.classList.add('active');
        else if (currentFilterView === 'all' && showAllBtn) showAllBtn.classList.add('active');
    }

    if (showActiveBtn) {
        showActiveBtn.addEventListener('click', function() {
            currentFilterView = 'active'; updateActiveButtonStates(); fetchAndDisplayTasks();
        });
    }
    if (showCompletedBtn) {
        showCompletedBtn.addEventListener('click', function() {
            currentFilterView = 'completed'; updateActiveButtonStates(); fetchAndDisplayTasks();
        });
    }
    if (showAllBtn) {
        showAllBtn.addEventListener('click', function() {
            currentFilterView = 'all'; updateActiveButtonStates(); fetchAndDisplayTasks();
        });
    }

    if (startFocusModeBtn) { 
        startFocusModeBtn.addEventListener('click', async function() {
            let determinedSelectedId = null;
            let tasksForFocus = [];
            if (currentFilterView === 'active') {
                tasksForFocus = currentTasks.filter(task => !task.completed);
            } else if (currentFilterView === 'all') {
                tasksForFocus = currentTasks.filter(task => !task.completed); 
            }
            if (tasksForFocus.length > 0) {
                determinedSelectedId = tasksForFocus[0].id; 
            }
            const newState = await updateAppState({ 
                focus_mode: true, 
                selected_task_id: determinedSelectedId 
            });
            if (newState) { window.location.href = '/focus'; } 
            else { alert("Could not enter focus mode. Please try again."); }
        });
    }

    updateActiveButtonStates(); 
    await initializePomodoro(); 
    fetchAndDisplayTasks(); 
});
