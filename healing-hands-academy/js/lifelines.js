// Lifelines System for Who Wants to be a Massage Millionaire

class Lifelines {
    constructor(gameLogic) {
        this.game = gameLogic;
        this.available = {
            'fifty-fifty': true,
            'phone-friend': true,
            'ask-audience': true
        };
    }

    useFiftyFifty() {
        if (!this.available['fifty-fifty']) {
            console.warn('50/50 lifeline already used');
            return false;
        }

        this.available['fifty-fifty'] = false;
        this.updateLifelineUI('fifty-fifty');

        // Remove 2 wrong answers randomly
        const correctAnswer = this.game.currentQuestion.correct;
        const wrongAnswers = ['A', 'B', 'C', 'D'].filter(option => option !== correctAnswer);
        
        // Randomly select 2 wrong answers to eliminate
        const shuffled = this.shuffleArray([...wrongAnswers]);
        const toEliminate = shuffled.slice(0, 2);

        // Apply elimination with animation
        toEliminate.forEach((option, index) => {
            setTimeout(() => {
                const button = document.querySelector(`[data-answer="${option}"]`);
                button.classList.add('eliminated');
                button.disabled = true;
                
                // Add elimination effect
                this.addEliminationEffect(button);
            }, index * 500);
        });

        this.game.audioManager.playLifelineSound();
        return true;
    }

    async usePhoneFriend() {
        if (!this.available['phone-friend']) {
            console.warn('Phone a Friend lifeline already used');
            return false;
        }

        this.available['phone-friend'] = false;
        this.updateLifelineUI('phone-friend');

        const modal = document.getElementById('phone-friend-modal');
        const callingDiv = document.querySelector('.friend-calling');
        const responseDiv = document.getElementById('friend-response');
        const adviceDiv = document.getElementById('friend-advice');
        const closeBtn = document.getElementById('close-phone');

        // Show modal and start calling animation
        modal.classList.add('active');
        callingDiv.style.display = 'block';
        responseDiv.style.display = 'none';
        closeBtn.style.display = 'none';

        // Add ringing sound effect
        this.playRingingSound();

        try {
            // Generate friend's response
            const response = await this.game.claudeAPI.generatePhoneFriendResponse(
                this.game.currentQuestion.question,
                this.game.currentQuestion.options,
                this.game.currentQuestion.correct
            );

            // Show response after "connecting"
            setTimeout(() => {
                callingDiv.style.display = 'none';
                adviceDiv.textContent = response;
                responseDiv.style.display = 'block';
                closeBtn.style.display = 'block';
                
                this.game.audioManager.playLifelineSound();
            }, 3000);

        } catch (error) {
            console.error('Error getting friend response:', error);
            
            // Fallback response
            setTimeout(() => {
                callingDiv.style.display = 'none';
                adviceDiv.textContent = "Sorry, I'm not completely sure about this one. I think I'd lean towards one of the middle options, but trust your instincts!";
                responseDiv.style.display = 'block';
                closeBtn.style.display = 'block';
            }, 3000);
        }

        return true;
    }

    useAskAudience() {
        if (!this.available['ask-audience']) {
            console.warn('Ask the Audience lifeline already used');
            return false;
        }

        this.available['ask-audience'] = false;
        this.updateLifelineUI('ask-audience');

        const modal = document.getElementById('ask-audience-modal');
        const results = this.generateAudienceResults();

        // Animate the results
        this.animateAudienceResults(results);

        modal.classList.add('active');
        this.game.audioManager.playLifelineSound();

        return true;
    }

    generateAudienceResults() {
        const correctAnswer = this.game.currentQuestion.correct;
        const difficulty = this.game.levelDifficulty[this.game.currentLevel];
        
        // Audience accuracy decreases with difficulty
        const accuracyMap = {
            1: 0.8,  // 80% chance correct answer gets highest votes
            2: 0.7,  // 70% chance
            3: 0.6,  // 60% chance
            4: 0.5,  // 50% chance
            5: 0.4   // 40% chance
        };

        const accuracy = accuracyMap[difficulty] || 0.6;
        const results = { A: 0, B: 0, C: 0, D: 0 };

        if (Math.random() < accuracy) {
            // Correct answer gets highest percentage
            results[correctAnswer] = this.randomBetween(35, 65);
        } else {
            // Random answer gets highest percentage
            const randomAnswer = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)];
            results[randomAnswer] = this.randomBetween(35, 55);
        }

        // Distribute remaining percentage
        const remainingAnswers = ['A', 'B', 'C', 'D'].filter(option => results[option] === 0);
        let remainingPercent = 100 - Math.max(...Object.values(results));

        remainingAnswers.forEach((option, index) => {
            if (index === remainingAnswers.length - 1) {
                // Last option gets remaining percentage
                results[option] = remainingPercent;
            } else {
                const percent = this.randomBetween(5, Math.floor(remainingPercent / 2));
                results[option] = percent;
                remainingPercent -= percent;
            }
        });

        // Ensure total is 100%
        const total = Object.values(results).reduce((sum, val) => sum + val, 0);
        if (total !== 100) {
            const diff = 100 - total;
            results[correctAnswer] += diff;
        }

        return results;
    }

    animateAudienceResults(results) {
        // Reset bars
        document.querySelectorAll('.bar').forEach(bar => {
            bar.style.width = '0%';
        });

        document.querySelectorAll('.percentage').forEach(pct => {
            pct.textContent = '0%';
        });

        // Animate each bar
        ['A', 'B', 'C', 'D'].forEach((option, index) => {
            setTimeout(() => {
                const bar = document.querySelector(`.bar-${option.toLowerCase()}`);
                const percentage = document.querySelector(`.audience-bar:nth-child(${index + 1}) .percentage`);
                
                if (bar && percentage) {
                    bar.style.width = `${results[option]}%`;
                    percentage.textContent = `${results[option]}%`;
                }
            }, index * 500);
        });
    }

    updateLifelineUI(lifelineName) {
        const lifelines = {
            'fifty-fifty': 'fiftyfifty',
            'phone-friend': 'phonefriend', 
            'ask-audience': 'askaudience'
        };

        const buttonId = lifelines[lifelineName];
        if (buttonId) {
            const button = document.getElementById(buttonId);
            if (button) {
                button.classList.add('used');
                button.disabled = true;
                
                // Add visual effect for used lifeline
                this.addUsedEffect(button);
            }
        }
    }

    addEliminationEffect(button) {
        // Add strikethrough effect
        button.style.position = 'relative';
        
        const strikethrough = document.createElement('div');
        strikethrough.style.cssText = `
            position: absolute;
            top: 50%;
            left: 0;
            width: 100%;
            height: 3px;
            background: red;
            transform: translateY(-50%) scaleX(0);
            transform-origin: left;
            transition: transform 0.5s ease;
        `;
        
        button.appendChild(strikethrough);
        
        // Trigger animation
        setTimeout(() => {
            strikethrough.style.transform = 'translateY(-50%) scaleX(1)';
        }, 100);
    }

    addUsedEffect(button) {
        // Add greyed out effect with checkmark
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ff0000;
            font-size: 2rem;
            font-weight: bold;
        `;
        overlay.textContent = '✗';
        
        button.style.position = 'relative';
        button.appendChild(overlay);
    }

    playRingingSound() {
        // Create ringing sound effect
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create ringing pattern
            for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.value = 800;
                    oscillator.type = 'sine';
                    
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                    
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.3);
                }, i * 500);
            }
        } catch (error) {
            console.warn('Could not create ringing sound:', error);
        }
    }

    // Utility functions
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    reset() {
        this.available = {
            'fifty-fifty': true,
            'phone-friend': true,
            'ask-audience': true
        };

        // Reset UI
        ['fiftyfifty', 'phonefriend', 'askaudience'].forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                button.classList.remove('used');
                button.disabled = false;
                
                // Remove any overlay effects
                const overlay = button.querySelector('div[style*="position: absolute"]');
                if (overlay) {
                    overlay.remove();
                }
            }
        });
    }
}

// Export for use in other modules
window.Lifelines = Lifelines;