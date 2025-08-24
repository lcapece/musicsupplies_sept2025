// UI Controller for Who Wants to be a Massage Millionaire
// This module handles all UI interactions and animations

class UIController {
    constructor(gameLogic, audioManager) {
        this.gameLogic = gameLogic;
        this.audioManager = audioManager;
        this.animationDuration = 300;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupAnimations();
    }

    setupEventListeners() {
        // Answer button interactions
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                if (!btn.disabled && !btn.classList.contains('selected')) {
                    btn.classList.add('hover');
                }
            });

            btn.addEventListener('mouseleave', () => {
                btn.classList.remove('hover');
            });
        });

        // Lifeline button interactions
        document.querySelectorAll('.lifeline-btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                if (!btn.disabled) {
                    btn.classList.add('hover');
                }
            });

            btn.addEventListener('mouseleave', () => {
                btn.classList.remove('hover');
            });
        });
    }

    setupAnimations() {
        // Add entrance animations
        this.addEntranceAnimations();
    }

    addEntranceAnimations() {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.addEventListener('transitionend', (e) => {
                if (e.target === screen && screen.classList.contains('active')) {
                    this.onScreenActive(screen.id);
                }
            });
        });
    }

    onScreenActive(screenId) {
        switch (screenId) {
            case 'game-screen':
                this.animateGameElements();
                break;
            case 'main-menu':
                this.animateMenuElements();
                break;
        }
    }

    animateGameElements() {
        // Animate money ladder
        const moneyAmounts = document.querySelectorAll('.money-amount');
        moneyAmounts.forEach((amount, index) => {
            setTimeout(() => {
                amount.style.opacity = '1';
                amount.style.transform = 'translateX(0)';
            }, index * 50);
        });

        // Animate question area
        setTimeout(() => {
            document.getElementById('question-display').classList.add('animate-in');
        }, 500);

        // Animate answer buttons
        setTimeout(() => {
            document.querySelectorAll('.answer-btn').forEach((btn, index) => {
                setTimeout(() => {
                    btn.classList.add('animate-in');
                }, index * 100);
            });
        }, 800);
    }

    animateMenuElements() {
        const menuButtons = document.querySelectorAll('.menu-btn');
        menuButtons.forEach((btn, index) => {
            setTimeout(() => {
                btn.classList.add('animate-in');
            }, index * 150);
        });
    }

    // Question display animations
    displayQuestion(question, questionNumber, value) {
        const questionText = document.getElementById('question-text');
        const questionNum = document.getElementById('question-number');
        const questionValue = document.getElementById('question-value');

        // Fade out current content
        questionText.style.opacity = '0';
        
        setTimeout(() => {
            // Update content
            questionNum.textContent = `Question ${questionNumber}`;
            questionValue.textContent = `for $${value.toLocaleString()}`;
            questionText.textContent = question.question;

            // Update answer options
            this.updateAnswerOptions(question.options);

            // Fade in new content
            questionText.style.opacity = '1';
        }, this.animationDuration);
    }

    updateAnswerOptions(options) {
        const answerButtons = document.querySelectorAll('.answer-btn');
        
        answerButtons.forEach((btn, index) => {
            const letter = ['A', 'B', 'C', 'D'][index];
            const answerText = btn.querySelector('.answer-text');
            
            // Fade out
            btn.style.opacity = '0';
            
            setTimeout(() => {
                answerText.textContent = options[letter];
                btn.dataset.answer = letter;
                btn.style.opacity = '1';
            }, this.animationDuration / 2);
        });
    }

    // Answer selection animations
    selectAnswer(answer) {
        // Remove previous selections
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('selected', 'pulse');
        });

        // Select new answer
        const selectedBtn = document.querySelector(`[data-answer="${answer}"]`);
        selectedBtn.classList.add('selected', 'pulse');

        // Play selection sound
        if (this.audioManager) {
            this.audioManager.playSelectSound();
        }

        // Enable final answer button
        const finalAnswerBtn = document.getElementById('final-answer-btn');
        finalAnswerBtn.disabled = false;
        finalAnswerBtn.classList.add('ready');
    }

    // Answer reveal animations
    revealAnswer(selectedAnswer, correctAnswer, isCorrect) {
        const selectedBtn = document.querySelector(`[data-answer="${selectedAnswer}"]`);
        const correctBtn = document.querySelector(`[data-answer="${correctAnswer}"]`);

        // Remove pulse animation
        selectedBtn.classList.remove('pulse');

        if (isCorrect) {
            // Correct answer animation
            selectedBtn.classList.add('correct');
            this.showCorrectAnimation();
        } else {
            // Wrong answer animation
            selectedBtn.classList.add('incorrect');
            correctBtn.classList.add('correct');
            this.showIncorrectAnimation();
        }
    }

    showCorrectAnimation() {
        // Green flash effect
        document.body.classList.add('correct-flash');
        setTimeout(() => {
            document.body.classList.remove('correct-flash');
        }, 1000);

        // Confetti effect (simple version)
        this.createConfetti();
    }

    showIncorrectAnimation() {
        // Red flash effect
        document.body.classList.add('incorrect-flash');
        setTimeout(() => {
            document.body.classList.remove('incorrect-flash');
        }, 1000);
    }

    createConfetti() {
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        document.body.appendChild(confettiContainer);

        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.backgroundColor = this.getRandomColor();
            confettiContainer.appendChild(confetti);
        }

        // Remove confetti after animation
        setTimeout(() => {
            document.body.removeChild(confettiContainer);
        }, 4000);
    }

    getRandomColor() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6ab04c'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Money ladder animations
    updateMoneyLadder(currentLevel) {
        const moneyAmounts = document.querySelectorAll('.money-amount');
        
        moneyAmounts.forEach((amount, index) => {
            const level = 15 - index; // Reverse order (15 is at top)
            amount.classList.remove('current', 'completed', 'pulse');
            
            if (level === currentLevel) {
                amount.classList.add('current', 'pulse');
                this.scrollToCurrentLevel(amount);
            } else if (level < currentLevel) {
                amount.classList.add('completed');
            }
        });
    }

    scrollToCurrentLevel(element) {
        const ladder = document.getElementById('money-ladder');
        const elementTop = element.offsetTop;
        const ladderHeight = ladder.clientHeight;
        const scrollTo = elementTop - ladderHeight / 2 + element.clientHeight / 2;
        
        ladder.scrollTo({
            top: scrollTo,
            behavior: 'smooth'
        });
    }

    // Lifeline animations
    updateLifelinesUI(lifelines) {
        Object.entries(lifelines).forEach(([lifeline, available]) => {
            const btn = document.getElementById(lifeline.replace('-', ''));
            if (btn) {
                if (!available) {
                    btn.classList.add('used');
                    btn.disabled = true;
                } else {
                    btn.classList.remove('used');
                    btn.disabled = false;
                }
            }
        });
    }

    // Modal animations
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.classList.add('modal-enter');
            }
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.classList.add('modal-exit');
                setTimeout(() => {
                    modal.classList.remove('active');
                    modalContent.classList.remove('modal-enter', 'modal-exit');
                }, this.animationDuration);
            } else {
                modal.classList.remove('active');
            }
        }
    }

    // Loading screen animations
    updateLoadingProgress(percentage, text) {
        const progressBar = document.querySelector('.loading-progress');
        const loadingText = document.querySelector('.loading-text');
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        
        if (loadingText && text) {
            loadingText.textContent = text;
        }
    }

    // Button state management
    disableAllButtons() {
        document.querySelectorAll('.answer-btn, .control-btn, .lifeline-btn').forEach(btn => {
            btn.disabled = true;
        });
    }

    enableAnswerButtons() {
        document.querySelectorAll('.answer-btn').forEach(btn => {
            if (!btn.classList.contains('eliminated')) {
                btn.disabled = false;
            }
        });
    }

    resetAnswerButtons() {
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('selected', 'correct', 'incorrect', 'eliminated', 'pulse');
            btn.disabled = false;
        });

        // Reset final answer button
        const finalAnswerBtn = document.getElementById('final-answer-btn');
        finalAnswerBtn.disabled = true;
        finalAnswerBtn.classList.remove('ready');
    }

    // Audience poll animation
    animateAudienceResults(results) {
        Object.entries(results).forEach(([letter, percentage], index) => {
            const bar = document.querySelector(`.bar-${letter.toLowerCase()}`);
            const percentageSpan = document.querySelector(`.audience-bar:nth-child(${index + 1}) .percentage`);
            
            if (bar && percentageSpan) {
                setTimeout(() => {
                    bar.style.width = `${percentage}%`;
                    percentageSpan.textContent = `${percentage}%`;
                }, index * 200);
            }
        });
    }

    // Screen transition effects
    transitionToScreen(fromScreenId, toScreenId) {
        const fromScreen = document.getElementById(fromScreenId);
        const toScreen = document.getElementById(toScreenId);
        
        if (fromScreen) {
            fromScreen.classList.add('screen-exit');
            setTimeout(() => {
                fromScreen.classList.remove('active', 'screen-exit');
            }, this.animationDuration);
        }
        
        if (toScreen) {
            setTimeout(() => {
                toScreen.classList.add('active', 'screen-enter');
                setTimeout(() => {
                    toScreen.classList.remove('screen-enter');
                }, this.animationDuration);
            }, this.animationDuration / 2);
        }
    }

    // Utility methods
    addClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add(className);
        }
    }

    removeClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove(className);
        }
    }

    toggleClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.toggle(className);
        }
    }
}

// Export for use in other modules
window.UIController = UIController;