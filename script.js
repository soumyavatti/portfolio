// YouTube API player and state variables
let player;
let currentChannel = 'M-4zE2GG87w'; // Default channel
let isMuted = false;
let timerInterval = null;
let isTimerRunning = false;
let currentMode = 'pomodoro';
let pomodoroCount = 0;
let tasks = [];
let activeListId = 'default';
let currentFilter = 'all';
let lists = [{id: 'default', name: 'Main List', color: '#9764c7'}];
let settings = {
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
    soundEnabled: true,
    soundTheme: 'minimal'
};

// Timer duration for each mode (in seconds)
let timerDurations = {
    pomodoro: settings.pomodoro * 60,
    shortBreak: settings.shortBreak * 60,
    longBreak: settings.longBreak * 60
};

let timeLeft = timerDurations.pomodoro;
let activeTasks = 0;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize YouTube API
    loadYouTubeAPI();
    
    // Initialize dock behavior
    initDock();
    
    // Initialize pomodoro timer
    initPomodoro();
    
    // Initialize todo list
    initTodoList();
    
    // Load data from local storage
    loadDataFromLocalStorage();
    
    // Update UI with loaded data
    updateUI();
    
    // Add event listeners to show/hide panels
    document.getElementById('pomodoro-launcher').addEventListener('click', togglePomodoroPanel);
    document.getElementById('todo-launcher').addEventListener('click', toggleTodoPanel);
    document.getElementById('close-pomodoro').addEventListener('click', hidePomodoroPanel);
    document.getElementById('close-todo').addEventListener('click', hideTodoPanel);
    
    // Setup other event listeners
    document.getElementById('now-playing-card').addEventListener('click', function() {
        document.getElementById('dock').classList.add('visible');
    });
});

// Initialize dock behavior
function initDock() {
    const dock = document.getElementById('dock');
    
    // Show dock when mouse moves to bottom of screen
    document.addEventListener('mousemove', function(e) {
        const windowHeight = window.innerHeight;
        const threshold = windowHeight - 100;
        
        if (e.clientY > threshold) {
            dock.classList.add('visible');
        } else {
            if (!dock.matches(':hover')) {
                dock.classList.remove('visible');
            }
        }
    });
    
    // Hide dock when mouse leaves it (after a delay)
    dock.addEventListener('mouseleave', function() {
        setTimeout(() => {
            if (!dock.matches(':hover')) {
                dock.classList.remove('visible');
            }
        }, 500);
    });
}

// Initialize pomodoro timer
function initPomodoro() {
    // Add event listeners for pomodoro timer controls
    document.getElementById('start-pause-btn').addEventListener('click', toggleTimer);
    document.getElementById('reset-btn').addEventListener('click', resetTimer);
    document.getElementById('settings-btn').addEventListener('click', showSettings);
    
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    document.getElementById('close-settings').addEventListener('click', hideSettings);
    
    // Add event listeners for timer tabs
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const mode = this.getAttribute('data-mode');
            changeTimerMode(mode);
        });
    });
    
    // Set initial timer display
    updateTimerDisplay();
}

// Initialize todo list
function initTodoList() {
    document.getElementById('add-task-btn').addEventListener('click', addTask);
    document.getElementById('new-task-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTask();
        }
    });
    
    document.getElementById('clear-completed-btn').addEventListener('click', clearCompletedTasks);
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            changeFilter(filter);
        });
    });
    
    // Header click to show lists
    document.querySelector('.header-left').addEventListener('click', showListsModal);
}

// Load YouTube API
function loadYouTubeAPI() {
    // Load the YouTube IFrame Player API code asynchronously
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// YouTube API callback when ready
function onYouTubeIframeAPIReady() {
    player = new YT.Player('lofi-player', {
        height: '100%',
        width: '100%',
        videoId: currentChannel,
        playerVars: {
            'playsinline': 1,
            'autoplay': 1,
            'controls': 0,
            'showinfo': 0,
            'rel': 0,
            'iv_load_policy': 3,
            'fs': 0,
            'modestbranding': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

// YouTube player ready event
function onPlayerReady(event) {
    event.target.playVideo();
    updateNowPlaying();
}

// YouTube player state change event
function onPlayerStateChange(event) {
    // If video ends, restart it (for continuous play)
    if (event.data === YT.PlayerState.ENDED) {
        player.playVideo();
    }
}

// Toggle pomodoro panel visibility
function togglePomodoroPanel() {
    const panel = document.getElementById('pomodoro-window');
    if (panel.style.display === 'none') {
        showPomodoroPanel();
    } else {
        hidePomodoroPanel();
    }
    
    // Toggle active class on the button
    document.getElementById('pomodoro-launcher').classList.toggle('active');
}

// Show pomodoro panel
function showPomodoroPanel() {
    document.getElementById('pomodoro-window').style.display = 'block';
}

// Hide pomodoro panel
function hidePomodoroPanel() {
    document.getElementById('pomodoro-window').style.display = 'none';
    document.getElementById('pomodoro-launcher').classList.remove('active');
}

// Toggle todo panel visibility
function toggleTodoPanel() {
    const panel = document.getElementById('todo-window');
    if (panel.style.display === 'none') {
        showTodoPanel();
    } else {
        hideTodoPanel();
    }
    
    // Toggle active class on the button
    document.getElementById('todo-launcher').classList.toggle('active');
}

// Show todo panel
function showTodoPanel() {
    document.getElementById('todo-window').style.display = 'block';
}

// Hide todo panel
function hideTodoPanel() {
    document.getElementById('todo-window').style.display = 'none';
    document.getElementById('todo-launcher').classList.remove('active');
}

// Change the lofi channel
function changeChannel(videoId, element) {
    currentChannel = videoId;
    
    // Load the new video
    if (player && player.loadVideoById) {
        player.loadVideoById(videoId);
    }
    
    // Update UI to reflect the change
    updateNowPlaying();
    
    // Visual feedback for selected channel
    const buttons = document.querySelectorAll('.dock button');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    }
}

// Update the now playing card
function updateNowPlaying() {
    let title = "Unknown Channel";
    
    // Map video IDs to titles
    const channelTitles = {
        'M-4zE2GG87w': 'Spring Vibes',
        'r3JG5gBLbpA': 'Lost in Japan',
        'vrB9wC6quaU': 'Rooftop Rain',
        '92PvEVG0sKI': 'Rooftop in The City',
        'hB2LatX6NLg': 'Shibuya Nights',
        'vYIYIVmOo3Q': 'Rainy Nights',
        'CX9_h23icoM': 'Radio Lofi',
        'yf5NOyy1SXU': 'Room with City View'
    };
    
    if (channelTitles[currentChannel]) {
        title = channelTitles[currentChannel];
    }
    
    document.getElementById('now-playing-text').textContent = title;
}

// Toggle timer start/pause
function toggleTimer() {
    if (isTimerRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

// Start the timer
function startTimer() {
    if (!isTimerRunning) {
        isTimerRunning = true;
        document.getElementById('start-pause-text').textContent = 'Pause';
        
        // Start the timer interval
        timerInterval = setInterval(function() {
            timeLeft--;
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerComplete();
            }
            
            updateTimerDisplay();
        }, 1000);
        
        // Start particle animation
        if (currentMode === 'pomodoro') {
            startParticleAnimation();
        }
    }
}

// Pause the timer
function pauseTimer() {
    if (isTimerRunning) {
        isTimerRunning = false;
        document.getElementById('start-pause-text').textContent = 'Start';
        clearInterval(timerInterval);
    }
}

// Reset the timer
function resetTimer() {
    pauseTimer();
    timeLeft = timerDurations[currentMode];
    updateTimerDisplay();
}

// Timer completed
function timerComplete() {
    isTimerRunning = false;
    document.getElementById('start-pause-text').textContent = 'Start';
    
    // Play sound
    if (settings.soundEnabled) {
        playTimerEndSound();
    }
    
    // Update pomodoro count and progress dots
    if (currentMode === 'pomodoro') {
        pomodoroCount++;
        updatePomodoroCount();
        
        // After 4 pomodoros, take a long break
        if (pomodoroCount % 4 === 0) {
            changeTimerMode('longBreak');
        } else {
            changeTimerMode('shortBreak');
        }
    } else {
        // After a break, go back to pomodoro
        changeTimerMode('pomodoro');
    }
}

// Update the timer display
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    const displayText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.querySelector('.timer-time').textContent = displayText;
}

// Change timer mode (pomodoro/shortBreak/longBreak)
function changeTimerMode(mode) {
    // Reset timer
    pauseTimer();
    
    // Update mode
    currentMode = mode;
    timeLeft = timerDurations[mode];
    
    // Update UI
    updateTimerDisplay();
    
    // Remove active class from all tabs
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));
    
    // Add active class to the selected tab
    document.querySelector(`.tab-button[data-mode="${mode}"]`).classList.add('active');
}

// Update pomodoro count and progress dots
function updatePomodoroCount() {
    // Update progress dots
    const dots = document.querySelectorAll('.progress-dots .dot');
    const completedPomodoros = pomodoroCount % 4;
    
    dots.forEach((dot, index) => {
        if (index < completedPomodoros) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// Show settings panel
function showSettings() {
    // Populate settings inputs with current values
    document.getElementById('pomodoro-length').value = settings.pomodoro;
    document.getElementById('short-break-length').value = settings.shortBreak;
    document.getElementById('long-break-length').value = settings.longBreak;
    document.getElementById('sound-toggle').checked = settings.soundEnabled;
    document.getElementById('sound-theme').value = settings.soundTheme;
    
    // Show settings panel
    document.getElementById('settings-panel').classList.add('open');
}

// Hide settings panel
function hideSettings() {
    document.getElementById('settings-panel').classList.remove('open');
}

// Save settings
function saveSettings() {
    // Get values from inputs
    const pomodoroLength = parseInt(document.getElementById('pomodoro-length').value);
    const shortBreakLength = parseInt(document.getElementById('short-break-length').value);
    const longBreakLength = parseInt(document.getElementById('long-break-length').value);
    const soundEnabled = document.getElementById('sound-toggle').checked;
    const soundTheme = document.getElementById('sound-theme').value;
    
    // Update settings
    settings = {
        pomodoro: pomodoroLength,
        shortBreak: shortBreakLength,
        longBreak: longBreakLength,
        soundEnabled: soundEnabled,
        soundTheme: soundTheme
    };
    
    // Update timer durations
    timerDurations = {
        pomodoro: settings.pomodoro * 60,
        shortBreak: settings.shortBreak * 60,
        longBreak: settings.longBreak * 60
    };
    
    // Reset timer with new durations
    timeLeft = timerDurations[currentMode];
    updateTimerDisplay();
    
    // Save settings to local storage
    saveDataToLocalStorage();
    
    // Hide settings panel
    hideSettings();
}

// Add a new task
function addTask() {
    const input = document.getElementById('new-task-input');
    const taskName = input.value.trim();
    
    if (taskName !== '') {
        // Create new task object
        const task = {
            id: Date.now(),
            title: taskName,
            description: '',
            completed: false,
            dueDate: '',
            dueTime: '',
            priority: 'medium',
            listId: activeListId
        };
        
        // Add to tasks array
        tasks.push(task);
        
        // Clear input
        input.value = '';
        
        // Update UI
        renderTasks();
        updateTaskCounter();
        
        // Save to local storage
        saveDataToLocalStorage();
    }
}

// Toggle task completion
function toggleTaskCompletion(taskId) {
    tasks = tasks.map(task => {
        if (task.id === taskId) {
            return {...task, completed: !task.completed};
        }
        return task;
    });
    
    // Update UI
    renderTasks();
    updateTaskCounter();
    
    // Save to local storage
    saveDataToLocalStorage();
}

// Clear completed tasks
function clearCompletedTasks() {
    tasks = tasks.filter(task => !task.completed);
    
    // Update UI
    renderTasks();
    updateTaskCounter();
    
    // Save to local storage
    saveDataToLocalStorage();
}

// Change the active filter
function changeFilter(filter) {
    currentFilter = filter;
    
    // Update filter buttons UI
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        if (button.getAttribute('data-filter') === filter) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // Render tasks with the new filter
    renderTasks();
    
    // Save to local storage
    saveDataToLocalStorage();
}

// Show lists modal
function showListsModal() {
    // Render lists
    renderLists();
    
    // Show modal
    document.getElementById('lists-modal').classList.add('open');
}

// Hide lists modal
function hideListsModal() {
    document.getElementById('lists-modal').classList.remove('open');
}

// Render the task list
function renderTasks() {
    const tasksList = document.getElementById('tasks-list');
    tasksList.innerHTML = '';
    
    // Get filtered tasks
    const filteredTasks = getFilteredTasks();
    
    if (filteredTasks.length === 0) {
        // Show empty state
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <p>No tasks found</p>
            <p class="empty-description">Add a new task to get started</p>
        `;
        tasksList.appendChild(emptyState);
    } else {
        // Render each task
        filteredTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
            taskElement.setAttribute('data-id', task.id);
            
            // Get the task's list color
            const taskList = lists.find(list => list.id === task.listId) || lists[0];
            const listColor = taskList.color;
            
            taskElement.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <div class="task-content">
                    <div class="task-title">${task.title}</div>
                    ${task.dueDate ? `
                        <div class="task-details">
                            <div class="task-due-date">
                                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                ${formatDueDate(task.dueDate, task.dueTime)}
                            </div>
                            <div class="task-priority">
                                <span class="priority-indicator priority-${task.priority}"></span>
                                ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="task-actions">
                    <button class="edit-task-btn">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                </div>
            `;
            
            tasksList.appendChild(taskElement);
            
            // Add event listeners
            const checkbox = taskElement.querySelector('.task-checkbox');
            checkbox.addEventListener('change', function() {
                toggleTaskCompletion(task.id);
            });
            
            const editButton = taskElement.querySelector('.edit-task-btn');
            editButton.addEventListener('click', function() {
                // Show edit task modal
                // This would be implemented for the edit functionality
            });
        });
    }
}

// Get filtered tasks
function getFilteredTasks() {
    // Filter by list
    let filteredTasks = tasks.filter(task => task.listId === activeListId);
    
    // Apply additional filter
    if (currentFilter === 'active') {
        filteredTasks = filteredTasks.filter(task => !task.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = filteredTasks.filter(task => task.completed);
    }
    
    return filteredTasks;
}

// Update task counter
function updateTaskCounter() {
    const activeTasks = tasks.filter(task => task.listId === activeListId && !task.completed).length;
    const counterElement = document.getElementById('tasks-counter');
    
    counterElement.textContent = `${activeTasks} item${activeTasks !== 1 ? 's' : ''} left`;
}

// Render lists
function renderLists() {
    const listsContainer = document.getElementById('lists-container');
    listsContainer.innerHTML = '';
    
    lists.forEach(list => {
        const listElement = document.createElement('div');
        listElement.className = `list-item ${list.id === activeListId ? 'active' : ''}`;
        listElement.setAttribute('data-id', list.id);
        
        listElement.innerHTML = `
            <div class="list-color" style="background-color: ${list.color};"></div>
            <div class="list-name">${list.name}</div>
            <div class="list-options">
                <button class="list-option-btn edit-list-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                ${list.id !== 'default' ? `
                    <button class="list-option-btn delete-list-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                ` : ''}
            </div>
        `;
        
        listsContainer.appendChild(listElement);
        
        // Add event listeners
        listElement.addEventListener('click', function(e) {
            if (!e.target.closest('.list-option-btn')) {
                changeActiveList(list.id);
                hideListsModal();
            }
        });
        
        // Edit list button
        const editButton = listElement.querySelector('.edit-list-btn');
        if (editButton) {
            editButton.addEventListener('click', function(e) {
                e.stopPropagation();
                // Show edit list modal
                // This would be implemented for the edit functionality
            });
        }
        
        // Delete list button
        const deleteButton = listElement.querySelector('.delete-list-btn');
        if (deleteButton) {
            deleteButton.addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this list? All tasks in this list will be deleted.')) {
                    deleteList(list.id);
                }
            });
        }
    });
    
    // Add new list functionality
    document.getElementById('add-list-btn').addEventListener('click', addNewList);
    
    // Color picker
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
}

// Change active list
function changeActiveList(listId) {
    activeListId = listId;
    
    // Update UI
    renderTasks();
    updateTaskCounter();
    
    // Update header title
    const activeList = lists.find(list => list.id === listId);
    if (activeList) {
        document.querySelector('.app-title').textContent = activeList.name;
    }
    
    // Save to local storage
    saveDataToLocalStorage();
}

// Add new list
function addNewList() {
    const input = document.getElementById('new-list-input');
    const listName = input.value.trim();
    
    if (listName !== '') {
        // Get selected color
        const selectedColor = document.querySelector('.color-option.selected').getAttribute('data-color');
        
        // Create new list object
        const list = {
            id: Date.now().toString(),
            name: listName,
            color: selectedColor
        };
        
        // Add to lists array
        lists.push(list);
        
        // Clear input
        input.value = '';
        
        // Update UI
        renderLists();
        
        // Save to local storage
        saveDataToLocalStorage();
    }
}

// Delete list
function deleteList(listId) {
    // Remove list
    lists = lists.filter(list => list.id !== listId);
    
    // Delete tasks associated with this list
    tasks = tasks.filter(task => task.listId !== listId);
    
    // If active list was deleted, switch to default
    if (activeListId === listId) {
        changeActiveList('default');
    }
    
    // Update UI
    renderLists();
    renderTasks();
    updateTaskCounter();
    
    // Save to local storage
    saveDataToLocalStorage();
}

// Format due date for display
function formatDueDate(dateStr, timeStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const options = { month: 'short', day: 'numeric' };
    let formattedDate = date.toLocaleDateString('en-US', options);
    
    if (timeStr) {
        formattedDate += ` at ${timeStr}`;
    }
    
    return formattedDate;
}

// Play timer end sound
function playTimerEndSound() {
    let soundUrl;
    
    // Pick sound URL based on theme
    switch (settings.soundTheme) {
        case 'digital':
            soundUrl = 'https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3';
            break;
        case 'nature':
            soundUrl = 'https://assets.mixkit.co/sfx/preview/mixkit-bell-notification-933.mp3';
            break;
        default: // minimal
            soundUrl = 'https://assets.mixkit.co/sfx/preview/mixkit-software-interface-alert-248.mp3';
    }
    
    const audio = new Audio(soundUrl);
    audio.play();
}

// Start particle animation for pomodoro timer
function startParticleAnimation() {
    if (!isTimerRunning || currentMode !== 'pomodoro') return;
    
    const container = document.getElementById('particles-container');
    
    // Create particle
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random position along the bottom
    const posX = Math.random() * 100;
    particle.style.left = `${posX}%`;
    
    // Random size
    const size = Math.random() * 4 + 2;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Random duration
    const duration = Math.random() * 2 + 2;
    particle.style.setProperty('--duration', `${duration}s`);
    
    // Add to container
    container.appendChild(particle);
    
    // Remove after animation completes
    setTimeout(() => {
        particle.remove();
    }, duration * 1000);
    
    // Create more particles if timer is still running
    if (isTimerRunning && currentMode === 'pomodoro') {
        setTimeout(startParticleAnimation, Math.random() * 500 + 200);
    }
}

// Load data from local storage
function loadDataFromLocalStorage() {
    try {
        // Load settings
        const storedSettings = localStorage.getItem('lofiAppSettings');
        if (storedSettings) {
            settings = JSON.parse(storedSettings);
            
            // Update timer durations
            timerDurations = {
                pomodoro: settings.pomodoro * 60,
                shortBreak: settings.shortBreak * 60,
                longBreak: settings.longBreak * 60
            };
            
            timeLeft = timerDurations[currentMode];
        }
        
        // Load tasks
        const storedTasks = localStorage.getItem('lofiAppTasks');
        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
        }
        
        // Load lists
        const storedLists = localStorage.getItem('lofiAppLists');
        if (storedLists) {
            lists = JSON.parse(storedLists);
        }
        
        // Load active list
        const storedActiveList = localStorage.getItem('lofiAppActiveList');
        if (storedActiveList) {
            activeListId = storedActiveList;
        }
        
        // Load filter
        const storedFilter = localStorage.getItem('lofiAppFilter');
        if (storedFilter) {
            currentFilter = storedFilter;
        }
        
        // Load pomodoro count
        const storedCount = localStorage.getItem('lofiAppPomodoroCount');
        if (storedCount) {
            pomodoroCount = parseInt(storedCount);
        }
    } catch (error) {
        console.error('Error loading data from local storage:', error);
    }
}

// Save data to local storage
function saveDataToLocalStorage() {
    try {
        // Save settings
        localStorage.setItem('lofiAppSettings', JSON.stringify(settings));
        
        // Save tasks
        localStorage.setItem('lofiAppTasks', JSON.stringify(tasks));
        
        // Save lists
        localStorage.setItem('lofiAppLists', JSON.stringify(lists));
        
        // Save active list
        localStorage.setItem('lofiAppActiveList', activeListId);
        
        // Save filter
        localStorage.setItem('lofiAppFilter', currentFilter);
        
        // Save pomodoro count
        localStorage.setItem('lofiAppPomodoroCount', pomodoroCount);
    } catch (error) {
        console.error('Error saving data to local storage:', error);
    }
}

// Update the UI with loaded data
function updateUI() {
    // Update timer display
    updateTimerDisplay();
    
    // Update pomodoro count and progress dots
    updatePomodoroCount();
    
    // Update tasks
    renderTasks();
    updateTaskCounter();
    
    // Update filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        if (button.getAttribute('data-filter') === currentFilter) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // Update timer tabs
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        if (button.getAttribute('data-mode') === currentMode) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // Update todo app title with active list name
    const activeList = lists.find(list => list.id === activeListId);
    if (activeList) {
        document.querySelector('.app-title').textContent = activeList.name;
    }
}