class PomodoroTimer {
    constructor(settings = {}) {
        this.config = {
            workMinutes: 25,
            breakMinutes: 5,
            longBreakMinutes: 15, // Standard Pomodoro, though not in initial plan
            cyclesBeforeLongBreak: 4, // Standard Pomodoro
            workMinutes: 25,
            breakMinutes: 5,
            longBreakMinutes: 15,
            cyclesBeforeLongBreak: 4,
            enabled: true, // New: for overall feature toggle
            ...settings
        };
        this.cycles = settings.initialCycles || 0; // Allow setting initial cycles
        this.resetTimer(); // Call after this.cycles is set
        this.onMinuteChange = null; // Callback for time updates
        this.onStateChange = null; // Callback for state changes (work, break, paused)
        this.onCycleComplete = null; // Callback for when a work/break cycle ends
    }

    resetTimer() {
        this.stop();
        this.currentState = 'idle'; // 'idle', 'work', 'break', 'paused'
        this.isWorkSession = true; // Start with a work session
        this.minutes = this.config.workMinutes;
        this.seconds = 0;
        if (this.onStateChange) this.onStateChange(this.currentState, this.isWorkSession, this.minutes, this.seconds);
        if (this.onMinuteChange) this.onMinuteChange(this.minutes, this.seconds);
    }

    start() {
        if (this.timerInterval) return; // Already running

        if (this.currentState === 'idle' || (this.currentState === 'paused' && this.minutes === (this.isWorkSession ? this.config.workMinutes : (this.cycles % this.config.cyclesBeforeLongBreak === 0 ? this.config.longBreakMinutes : this.config.breakMinutes)) && this.seconds === 0) ) {
             // If starting from idle or a fully reset paused state, set to appropriate session
            this.minutes = this.isWorkSession ? this.config.workMinutes : 
                           (this.cycles > 0 && this.cycles % this.config.cyclesBeforeLongBreak === 0 ? this.config.longBreakMinutes : this.config.breakMinutes);
            this.seconds = 0;
        }

        this.currentState = 'running'; // Or distinguish between 'work' and 'break' running states
        if (this.onStateChange) this.onStateChange(this.isWorkSession ? 'work' : 'break', this.isWorkSession, this.minutes, this.seconds);

        this.timerInterval = setInterval(() => {
            if (this.seconds > 0) {
                this.seconds--;
            } else if (this.minutes > 0) {
                this.minutes--;
                this.seconds = 59;
            } else {
                // Timer reached zero
                this.stop(); // Stop current interval
                if (this.isWorkSession) {
                    this.cycles++;
                    this.isWorkSession = false; // Switch to break
                    this.minutes = (this.cycles % this.config.cyclesBeforeLongBreak === 0) ? this.config.longBreakMinutes : this.config.breakMinutes;
                    if (this.onCycleComplete) this.onCycleComplete('work', this.cycles);
                } else {
                    this.isWorkSession = true; // Switch to work
                    this.minutes = this.config.workMinutes;
                    if (this.onCycleComplete) this.onCycleComplete('break', this.cycles);
                }
                this.seconds = 0;
                // Automatically start next session or wait for user? For now, wait.
                this.currentState = 'idle'; // Ready for next start
                if (this.onStateChange) this.onStateChange(this.currentState, this.isWorkSession, this.minutes, this.seconds);
                if (this.onMinuteChange) this.onMinuteChange(this.minutes, this.seconds); // Update display to new session time
                return; // Exit interval function
            }

            if (this.onMinuteChange) this.onMinuteChange(this.minutes, this.seconds);
        }, 1000);
    }

    pause() {
        if (!this.timerInterval) return; // Not running
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.currentState = 'paused';
        if (this.onStateChange) this.onStateChange(this.currentState, this.isWorkSession, this.minutes, this.seconds);
    }
    
    stop() { // Also used by reset logic
        clearInterval(this.timerInterval);
        this.timerInterval = null;
    }

    // For manual transitions or re-configuration
    skipTo(sessionType) { // 'work' or 'break'
        this.stop();
        this.isWorkSession = sessionType === 'work';
        if (this.isWorkSession) {
            this.minutes = this.config.workMinutes;
            // this.cycles = 0; // Reset cycles if manually skipping to work? Or only on full reset?
        } else {
            // If skipping to break, assume current work cycle finished for long break logic
            // This might need refinement based on desired behavior
            // this.cycles++; // Or not, if it's just a quick switch
            this.minutes = (this.cycles > 0 && this.cycles % this.config.cyclesBeforeLongBreak === 0) ? this.config.longBreakMinutes : this.config.breakMinutes;
        }
        this.seconds = 0;
        this.currentState = 'idle'; // Ready to be started
        if (this.onStateChange) this.onStateChange(this.currentState, this.isWorkSession, this.minutes, this.seconds);
        if (this.onMinuteChange) this.onMinuteChange(this.minutes, this.seconds);
    }


    configure(newConfig) {
        const wasRunning = this.timerInterval != null;
        if(wasRunning) this.pause(); // Pause before reconfiguring if running

        this.config = { ...this.config, ...newConfig };
        
        // If timer is idle or paused, update its display minutes/seconds to reflect new config for current session type
        if (this.currentState === 'idle' || this.currentState === 'paused') {
             this.minutes = this.isWorkSession ? this.config.workMinutes : 
                           (this.cycles > 0 && (this.cycles % this.config.cyclesBeforeLongBreak === 0) ? this.config.longBreakMinutes : this.config.breakMinutes);
             this.seconds = 0;
             if (this.onMinuteChange) this.onMinuteChange(this.minutes, this.seconds);
        }
        // If it was running, user might need to restart it manually after config change.
        // Or, attempt to resume with new durations (more complex).
    }

    // Getter methods for UI updates (optional)
    getTime() {
        return { minutes: this.minutes, seconds: this.seconds };
    }

    getState() {
        return { 
            currentState: this.currentState, 
            isWorkSession: this.isWorkSession,
            cycles: this.cycles 
        };
    }
}
