document.addEventListener('DOMContentLoaded', async function() {
    const taskTitleDisplay = document.getElementById('current-task-title');
    const taskEffortDisplay = document.getElementById('current-task-effort');
    const taskSubtasksList = document.getElementById('current-task-subtasks');
    const completeNextBtn = document.getElementById('complete-next-btn');
    const exitFocusBtn = document.getElementById('exit-focus-btn');
    const taskDisplayArea = document.getElementById('task-display-area');
    const noMoreTasksMessage = document.getElementById('no-more-tasks-message');

    let allTasks = [];
    let activeTasks = [];
    let currentTaskIndex = 0;
    let appState = null; // To store fetched app_state

    async function fetchInitialData() {
        try {
            // Fetch app_state first to get selected_task_id if available
            const stateResponse = await fetch('/api/state');
            if (!stateResponse.ok) throw new Error('Failed to fetch app state');
            appState = await stateResponse.json();

            const tasksResponse = await fetch('/api/tasks');
            if (!tasksResponse.ok) throw new Error('Failed to fetch tasks');
            allTasks = await tasksResponse.json();
            
            activeTasks = allTasks.filter(task => !task.completed);

            // Determine starting task
            if (appState && appState.selected_task_id) {
                const selectedIndex = activeTasks.findIndex(task => task.id === appState.selected_task_id);
                if (selectedIndex !== -1) {
                    currentTaskIndex = selectedIndex;
                } else {
                    // selected_task_id might be for a completed task or invalid, clear it
                    if (appState.selected_task_id) { // Only update if it was set
                        await updateAppState({ selected_task_id: null }); 
                    }
                }
            }
             // If no selected_task_id or it was invalid, currentTaskIndex remains 0 (first active task)

            displayCurrentTask();

        } catch (error) {
            console.error("Error initializing focus mode:", error);
            if(taskTitleDisplay) taskTitleDisplay.textContent = "Error loading tasks.";
            if(taskDisplayArea) taskDisplayArea.style.display = 'block'; // Ensure it's visible to show error
            if(noMoreTasksMessage) noMoreTasksMessage.style.display = 'none';
            if(completeNextBtn) completeNextBtn.style.display = 'none'; // Hide button on error
        }
    }

    function displayCurrentTask() {
        if (activeTasks.length === 0 || currentTaskIndex >= activeTasks.length) {
            if(taskDisplayArea) taskDisplayArea.style.display = 'none';
            if(noMoreTasksMessage) noMoreTasksMessage.style.display = 'block';
            if(completeNextBtn) completeNextBtn.disabled = true; // Or hide
            return;
        }

        if(taskDisplayArea) taskDisplayArea.style.display = 'block';
        if(noMoreTasksMessage) noMoreTasksMessage.style.display = 'none';
        if(completeNextBtn) completeNextBtn.disabled = false;

        const task = activeTasks[currentTaskIndex];
        if(taskTitleDisplay) taskTitleDisplay.textContent = task.title;
        if(taskEffortDisplay) taskEffortDisplay.textContent = `Effort: ${task.effort}`;
        
        if(taskSubtasksList) {
            taskSubtasksList.innerHTML = ''; // Clear previous subtasks
            if (task.subtasks && task.subtasks.length > 0) {
                task.subtasks.forEach(subtask => {
                    const li = document.createElement('li');
                    li.textContent = subtask.title;
                    if (subtask.completed) {
                        li.classList.add('completed');
                    }
                    taskSubtasksList.appendChild(li);
                });
            }
        }
        document.title = `${task.title} - Focus Mode`;
    }

    async function completeAndNextTask() {
        if (activeTasks.length === 0 || currentTaskIndex >= activeTasks.length) return;

        const taskToComplete = activeTasks[currentTaskIndex];
        try {
            const response = await fetch(`/api/tasks/${taskToComplete.id}/complete`, { method: 'PUT' });
            if (!response.ok) throw new Error('Failed to complete task');

            // Remove from activeTasks list locally or re-fetch. Re-fetching is simpler.
            // For now, just increment index and if we run out, fetchInitialData will handle it.
            // Or, better, mark as complete locally and filter again.
            taskToComplete.completed = true; // Mark locally
            activeTasks = activeTasks.filter(t => !t.completed); // Re-filter

            // currentTaskIndex remains the same, as the array re-indexes.
            // If currentTaskIndex was the last item, it will now be out of bounds, handled by displayCurrentTask.
            
            displayCurrentTask();

        } catch (error) {
            console.error("Error completing task:", error);
            alert("Failed to complete task. Please try again.");
        }
    }

    async function updateAppState(stateUpdates) {
        try {
            await fetch('/api/state', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stateUpdates)
            });
        } catch (error) {
            console.error("Error updating app state:", error);
        }
    }
    
    if (completeNextBtn) {
        completeNextBtn.addEventListener('click', completeAndNextTask);
    }

    if (exitFocusBtn) {
        exitFocusBtn.addEventListener('click', async () => {
            // Update app_state to turn off focus_mode before navigating
            await updateAppState({ focus_mode: false, selected_task_id: null });
            window.location.href = '/'; // Navigate to main page
        });
    }
    
    // Add class to body for specific focus mode styling if needed by CSS
    document.body.classList.add('focus-mode-active');


    fetchInitialData(); // Load tasks and display the first one
});
