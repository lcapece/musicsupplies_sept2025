// Main Application Controller for Who Wants to be a Massage Millionaire

class MassageMillionaireApp {
    constructor() {
        this.gameLogic = null;
        this.audioManager = null;
        this.currentScreen = 'loading';
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            // Initialize core systems
            this.audioManager = new AudioManager();
            this.gameLogic = new GameLogic();
            
            // Initialize UI
            this.initializeEventListeners();
            this.setupModals();
            
            // Preload audio
            this.audioManager.preloadSounds();
            
            // Simulate loading time for dramatic effect
            await this.simulateLoading();
            
            // Show main menu
            this.showMainMenu();
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to load the game. Please refresh the page.');
        }
    }

    async simulateLoading() {
        const loadingProgress = document.querySelector('.loading-progress');
        const loadingText = document.querySelector('.loading-text');
        
        const steps = [
            { progress: 20, text: 'Loading massage therapy questions...' },
            { progress: 40, text: 'Initializing lifelines...' },
            { progress: 60, text: 'Preparing audio system...' },
            { progress: 80, text: 'Setting up game engine...' },
            { progress: 100, text: 'Ready to play!' }
        ];

        for (const step of steps) {
            loadingProgress.style.width = `${step.progress}%`;
            loadingText.textContent = step.text;
            await this.delay(800);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    initializeEventListeners() {
        // Add mobile touch optimization
        this.addMobileTouchSupport();
        
        // Main menu buttons
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.startNewGame();
        });

        document.getElementById('practice-mode-btn').addEventListener('click', () => {
            this.startPracticeMode();
        });

        document.getElementById('high-scores-btn').addEventListener('click', () => {
            this.showHighScores();
        });

        document.getElementById('about-btn').addEventListener('click', () => {
            this.showAbout();
        });

        // Game controls
        document.getElementById('final-answer-btn').addEventListener('click', () => {
            this.showFinalAnswerConfirmation();
        });

        document.getElementById('walk-away-btn').addEventListener('click', () => {
            this.confirmWalkAway();
        });

        // Answer buttons
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const answer = e.currentTarget.dataset.answer;
                this.gameLogic.selectAnswer(answer);
            });
        });

        // Lifeline buttons
        const fiftyFiftyBtn = document.getElementById('fifty-fifty');
        if (fiftyFiftyBtn) {
            fiftyFiftyBtn.addEventListener('click', () => {
                this.gameLogic.useFiftyFifty();
            });
        }

        const phoneBtn = document.getElementById('phone-friend');
        if (phoneBtn) {
            phoneBtn.addEventListener('click', () => {
                this.gameLogic.usePhoneFriend();
            });
        }

        const audienceBtn = document.getElementById('ask-audience');
        if (audienceBtn) {
            audienceBtn.addEventListener('click', () => {
                this.gameLogic.useAskAudience();
            });
        }

        // Modal controls
        this.setupModalEventListeners();
        
        // Settings
        this.setupSettingsEventListeners();
    }

    setupModalEventListeners() {
        // Final answer confirmation
        document.getElementById('confirm-final').addEventListener('click', () => {
            this.hideModal('final-answer-modal');
            this.gameLogic.submitFinalAnswer();
        });

        document.getElementById('cancel-final').addEventListener('click', () => {
            this.hideModal('final-answer-modal');
        });

        // Phone a friend
        document.getElementById('close-phone').addEventListener('click', () => {
            this.hideModal('phone-friend-modal');
        });

        // Ask audience
        document.getElementById('close-audience').addEventListener('click', () => {
            this.hideModal('ask-audience-modal');
        });

        // Results modal
        document.getElementById('next-question-btn').addEventListener('click', () => {
            this.hideModal('results-modal');
            this.gameLogic.nextQuestion();
        });

        // Game over modal
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.hideModal('game-over-modal');
            this.startNewGame();
        });

        document.getElementById('main-menu-btn').addEventListener('click', () => {
            this.hideModal('game-over-modal');
            this.showMainMenu();
        });
    }

    setupSettingsEventListeners() {
        // Volume control
        const volumeSlider = document.getElementById('volume-slider');
        const volumeDisplay = document.getElementById('volume-display');
        
        if (volumeSlider && volumeDisplay) {
            volumeSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                this.audioManager.setVolume(volume);
                volumeDisplay.textContent = `${e.target.value}%`;
            });
        }

        // Mute toggle
        const muteToggle = document.getElementById('mute-toggle');
        if (muteToggle) {
            muteToggle.addEventListener('change', (e) => {
                this.audioManager.setEnabled(!e.target.checked);
            });
        }
    }

    setupModals() {
        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
        }
    }

    showMainMenu() {
        this.showScreen('main-menu');
        this.audioManager.playIntroMusic();
    }

    async startNewGame() {
        this.showScreen('game-screen');
        this.audioManager.stopCurrentMusic();
        
        try {
            await this.gameLogic.startNewGame();
        } catch (error) {
            console.error('Failed to start new game:', error);
            this.showError('Failed to start game. Please try again.');
        }
    }

    startPracticeMode() {
        // TODO: Implement practice mode
        alert('Practice mode coming soon!');
    }

    showHighScores() {
        // TODO: Implement high scores
        alert('High scores coming soon!');
    }

    showAbout() {
        alert('Who Wants to be a Massage Millionaire?\n\nTest your massage therapy knowledge and work your way up to the million dollar question!\n\nFeatures:\n- 15 questions with increasing difficulty\n- 3 lifelines: 50/50, Phone a Friend, Ask the Audience\n- Real massage therapy board exam content\n- Safe harbors at $1,000 and $32,000');
    }

    showFinalAnswerConfirmation() {
        const selectedAnswer = this.gameLogic.selectedAnswer;
        if (!selectedAnswer) return;

        const selectedBtn = document.querySelector(`[data-answer="${selectedAnswer}"]`);
        const answerText = selectedBtn.querySelector('.answer-text').textContent;
        
        document.getElementById('selected-answer-display').innerHTML = 
            `<strong>${selectedAnswer}:</strong> ${answerText}`;
        
        this.showModal('final-answer-modal');
    }

    confirmWalkAway() {
        const currentLevel = this.gameLogic.currentLevel;
        const currentWinnings = currentLevel > 1 ? this.gameLogic.moneyLadder[currentLevel - 2] : 0;
        const safeAmount = this.gameLogic.getSafeAmount();
        const walkAwayAmount = Math.max(currentWinnings, safeAmount);

        const confirmed = confirm(
            `Are you sure you want to walk away?\n\n` +
            `You will leave with: $${walkAwayAmount.toLocaleString()}\n\n` +
            `Next question is worth: $${this.gameLogic.moneyLadder[currentLevel - 1].toLocaleString()}`
        );

        if (confirmed) {
            this.gameLogic.walkAway();
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    showError(message) {
        alert(`Error: ${message}`);
    }

    addMobileTouchSupport() {
        // Prevent double-tap zoom on mobile
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (event) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        // Prevent context menu on long press for mobile
        document.addEventListener('contextmenu', function(e) {
            if (e.target.closest('.answer-btn, .menu-btn, .control-btn, .lifeline-btn')) {
                e.preventDefault();
            }
        });

        // Add haptic feedback for touch devices (if supported)
        this.addHapticFeedback();

        // Optimize scroll behavior
        this.optimizeScrolling();
    }

    addHapticFeedback() {
        if ('vibrate' in navigator) {
            // Add haptic feedback to button interactions
            document.addEventListener('click', (e) => {
                if (e.target.closest('.answer-btn, .menu-btn, .control-btn, .lifeline-btn')) {
                    navigator.vibrate(10); // Short vibration
                }
            });
        }
    }

    optimizeScrolling() {
        // Smooth scrolling for mobile
        if (CSS.supports('scroll-behavior', 'smooth')) {
            document.documentElement.style.scrollBehavior = 'smooth';
        }

        // Prevent overscroll bounce on iOS
        document.body.style.overscrollBehavior = 'none';

        // Optimize money ladder scrolling on mobile
        const moneyLadder = document.getElementById('money-ladder');
        if (moneyLadder) {
            moneyLadder.style.webkitOverflowScrolling = 'touch';
        }
    }

    // Keyboard shortcuts
    handleKeyPress(event) {
        if (!this.isInitialized || this.currentScreen !== 'game-screen') return;

        switch (event.key.toLowerCase()) {
            case 'a':
            case 'b':
            case 'c':
            case 'd':
                if (this.gameLogic.isGameActive) {
                    this.gameLogic.selectAnswer(event.key.toUpperCase());
                }
                break;
            case 'enter':
                if (this.gameLogic.selectedAnswer) {
                    this.showFinalAnswerConfirmation();
                }
                break;
            case 'escape':
                this.confirmWalkAway();
                break;
            case '1':
                this.gameLogic.useFiftyFifty();
                break;
            case '2':
                this.gameLogic.usePhoneFriend();
                break;
            case '3':
                this.gameLogic.useAskAudience();
                break;
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new MassageMillionaireApp();
    
    // Add keyboard event listener
    document.addEventListener('keydown', (event) => {
        app.handleKeyPress(event);
    });
    
    // Make app globally accessible for debugging
    window.massageMillionaireApp = app;
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (window.massageMillionaireApp && window.massageMillionaireApp.audioManager) {
        if (document.hidden) {
            // Pause audio when tab is hidden
            window.massageMillionaireApp.audioManager.stopCurrentMusic();
        }
    }
});

// Export for use in other modules
window.MassageMillionaireApp = MassageMillionaireApp;