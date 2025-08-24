// Who Wants to be a Massage Millionaire - Game Logic

class GameLogic {
    constructor() {
        this.currentLevel = 1;
        this.currentQuestion = null;
        this.selectedAnswer = null;
        this.lifelinesAvailable = {
            'fifty-fifty': true,
            'phone-friend': true,
            'ask-audience': true
        };
        this.isGameActive = false;
        this.questionBank = [];
        this.usedQuestions = new Set();
        
        // Money ladder
        this.moneyLadder = [
            100, 200, 300, 500, 1000,           // Levels 1-5
            2000, 4000, 8000, 16000, 32000,    // Levels 6-10
            64000, 125000, 250000, 500000, 1000000  // Levels 11-15
        ];
        
        // Safe harbors
        this.safeHarbors = [5, 10]; // $1,000 and $32,000
        
        // Difficulty and category mapping
        this.levelDifficulty = {
            1: 1, 2: 1, 3: 1,           // Very Easy
            4: 2, 5: 2, 6: 2,           // Easy  
            7: 3, 8: 3, 9: 3,           // Medium
            10: 4, 11: 4, 12: 4,        // Hard
            13: 5, 14: 5, 15: 5         // Expert
        };
        
        this.categories = [
            'anatomy', 'kinesiology', 'pathology', 
            'benefits', 'assessment', 'ethics'
        ];
        
        this.claudeAPI = new ClaudeAPI();
        this.audioManager = new AudioManager();
        this.lifelinesManager = new Lifelines(this);
    }

    async startNewGame() {
        this.currentLevel = 1;
        this.selectedAnswer = null;
        this.isGameActive = true;
        this.usedQuestions.clear();
        
        // Reset lifelines
        this.lifelinesAvailable = {
            'fifty-fifty': true,
            'phone-friend': true,
            'ask-audience': true
        };
        
        // Reset UI
        this.updateMoneyLadder();
        this.updateLifelinesUI();
        
        // Load first batch of questions
        await this.preloadQuestions();
        
        // Start with first question
        await this.nextQuestion();
        
        this.audioManager.playQuestionMusic();
    }

    async preloadQuestions() {
        try {
            const difficulty = this.levelDifficulty[this.currentLevel];
            const category = this.categories[Math.floor(Math.random() * this.categories.length)];
            
            // Try to get questions from API, but always use fallback if it fails
            let questions = [];
            try {
                questions = await this.claudeAPI.generateQuestions(difficulty, category, 10);
            } catch (apiError) {
                console.warn('API failed, using fallback questions:', apiError);
                questions = [];
            }
            
            // If no questions from API, use fallback questions
            if (!questions || questions.length === 0) {
                questions = this.claudeAPI.getFallbackQuestions(difficulty, category, 10);
            }
            
            this.questionBank = [...this.questionBank, ...questions];
            
            console.log(`Preloaded ${questions.length} questions for difficulty ${difficulty}`);
        } catch (error) {
            console.error('Error preloading questions:', error);
            // Ensure we always have some questions
            const fallbackQuestions = this.claudeAPI.getFallbackQuestions(1, 'anatomy', 10);
            this.questionBank = [...this.questionBank, ...fallbackQuestions];
        }
    }

    async nextQuestion() {
        if (this.currentLevel > 15) {
            this.gameWon();
            return;
        }

        // Get next question
        this.currentQuestion = await this.getNextQuestion();
        
        if (!this.currentQuestion) {
            console.error('No question available');
            return;
        }

        // Update UI
        this.displayQuestion();
        this.updateMoneyLadder();
        this.resetAnswerButtons();
        
        // Reset selected answer
        this.selectedAnswer = null;
        document.getElementById('final-answer-btn').disabled = true;
    }

    async getNextQuestion() {
        // Filter out used questions
        const availableQuestions = this.questionBank.filter(q => 
            !this.usedQuestions.has(q.question)
        );
        
        if (availableQuestions.length < 3) {
            // Preload more questions
            await this.preloadQuestions();
        }
        
        // Get a question matching current difficulty
        const difficulty = this.levelDifficulty[this.currentLevel];
        const matchingQuestions = availableQuestions.filter(q => 
            Math.abs(q.difficulty - difficulty) <= 1
        );
        
        if (matchingQuestions.length === 0) {
            return availableQuestions[0] || this.getFallbackQuestion();
        }
        
        const question = matchingQuestions[Math.floor(Math.random() * matchingQuestions.length)];
        this.usedQuestions.add(question.question);
        
        return question;
    }

    getFallbackQuestion() {
        return {
            question: "Which of these is a basic massage stroke?",
            options: {
                A: "Effleurage",
                B: "Percussion",
                C: "Trepanation", 
                D: "Cauterization"
            },
            correct: "A",
            explanation: "Effleurage is one of the five basic Swedish massage strokes, involving long, gliding movements.",
            category: "Massage Techniques",
            difficulty: this.levelDifficulty[this.currentLevel]
        };
    }

    displayQuestion() {
        const questionNum = document.getElementById('question-number');
        const questionValue = document.getElementById('question-value');
        const questionText = document.getElementById('question-text');
        const answerButtons = document.querySelectorAll('.answer-btn');

        questionNum.textContent = `Question ${this.currentLevel}`;
        questionValue.textContent = `for $${this.moneyLadder[this.currentLevel - 1].toLocaleString()}`;
        questionText.textContent = this.currentQuestion.question;

        // Update answer options
        answerButtons.forEach((btn, index) => {
            const letter = ['A', 'B', 'C', 'D'][index];
            btn.querySelector('.answer-text').textContent = this.currentQuestion.options[letter];
            btn.dataset.answer = letter;
        });
    }

    selectAnswer(answer) {
        // Remove previous selection
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Select new answer
        const selectedBtn = document.querySelector(`[data-answer="${answer}"]`);
        selectedBtn.classList.add('selected');
        
        this.selectedAnswer = answer;
        document.getElementById('final-answer-btn').disabled = false;
        
        this.audioManager.playSelectSound();
    }

    async submitFinalAnswer() {
        if (!this.selectedAnswer) return;

        this.audioManager.stopQuestionMusic();
        this.audioManager.playFinalAnswerSound();
        
        // Disable all controls
        document.querySelectorAll('.answer-btn, .control-btn, .lifeline-btn').forEach(btn => {
            btn.disabled = true;
        });

        // Show result after suspense
        setTimeout(() => {
            this.revealAnswer();
        }, 3000);
    }

    revealAnswer() {
        const isCorrect = this.selectedAnswer === this.currentQuestion.correct;
        const correctBtn = document.querySelector(`[data-answer="${this.currentQuestion.correct}"]`);
        const selectedBtn = document.querySelector(`[data-answer="${this.selectedAnswer}"]`);

        if (isCorrect) {
            correctBtn.classList.add('correct');
            this.audioManager.playCorrectSound();
            
            setTimeout(() => {
                this.currentLevel++;
                
                if (this.currentLevel > 15) {
                    this.gameWon();
                } else {
                    this.showCorrectModal();
                }
            }, 2000);
        } else {
            correctBtn.classList.add('correct');
            selectedBtn.classList.add('incorrect');
            this.audioManager.playWrongSound();
            
            setTimeout(() => {
                this.gameOver(false);
            }, 3000);
        }
    }

    showCorrectModal() {
        const modal = document.getElementById('results-modal');
        const title = document.getElementById('result-title');
        const icon = document.getElementById('result-icon');
        const explanation = document.getElementById('result-explanation');
        
        title.textContent = 'Correct!';
        icon.textContent = '✅';
        explanation.textContent = this.currentQuestion.explanation;
        
        modal.classList.add('active');
    }

    async walkAway() {
        const currentWinnings = this.currentLevel > 1 ? this.moneyLadder[this.currentLevel - 2] : 0;
        const safeAmount = this.getSafeAmount();
        const finalAmount = Math.max(currentWinnings, safeAmount);
        
        this.audioManager.stopQuestionMusic();
        this.gameOver(true, finalAmount);
    }

    getSafeAmount() {
        if (this.currentLevel > 10) return this.moneyLadder[9]; // $32,000
        if (this.currentLevel > 5) return this.moneyLadder[4];  // $1,000
        return 0;
    }

    gameWon() {
        this.audioManager.playMillionaireSound();
        this.showGameOverModal(true, 1000000);
    }

    gameOver(walkAway = false, amount = null) {
        this.isGameActive = false;
        
        let finalAmount;
        if (walkAway && amount !== null) {
            finalAmount = amount;
        } else if (walkAway) {
            finalAmount = this.getSafeAmount();
        } else {
            finalAmount = this.getSafeAmount();
        }
        
        this.showGameOverModal(walkAway, finalAmount);
    }

    showGameOverModal(walkAway, amount) {
        const modal = document.getElementById('game-over-modal');
        const title = document.getElementById('game-over-title');
        const content = document.getElementById('game-over-content');
        const scoreDiv = document.getElementById('final-score');
        const correctDiv = document.getElementById('correct-answer');
        const explanationDiv = document.getElementById('explanation');
        
        if (amount === 1000000) {
            title.textContent = '🎉 CONGRATULATIONS! 🎉';
            scoreDiv.innerHTML = `<h3>You are a MASSAGE MILLIONAIRE!</h3><p class="final-amount">$1,000,000</p>`;
        } else if (walkAway) {
            title.textContent = 'You Walked Away';
            scoreDiv.innerHTML = `<p class="final-amount">$${amount.toLocaleString()}</p>`;
        } else {
            title.textContent = 'Game Over';
            scoreDiv.innerHTML = `<p class="final-amount">$${amount.toLocaleString()}</p>`;
            correctDiv.innerHTML = `<p><strong>Correct Answer:</strong> ${this.currentQuestion.correct}) ${this.currentQuestion.options[this.currentQuestion.correct]}</p>`;
            explanationDiv.innerHTML = `<p>${this.currentQuestion.explanation}</p>`;
        }
        
        modal.classList.add('active');
    }

    updateMoneyLadder() {
        const moneyAmounts = document.querySelectorAll('.money-amount');
        
        moneyAmounts.forEach((amount, index) => {
            const level = 15 - index; // Reverse order
            amount.classList.remove('current', 'completed');
            
            if (level === this.currentLevel) {
                amount.classList.add('current');
            } else if (level < this.currentLevel) {
                amount.classList.add('completed');
            }
        });
    }

    updateLifelinesUI() {
        Object.keys(this.lifelinesAvailable).forEach(lifeline => {
            const btn = document.getElementById(lifeline);
            if (btn && !this.lifelinesAvailable[lifeline]) {
                btn.classList.add('used');
                btn.disabled = true;
            }
        });
    }

    resetAnswerButtons() {
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('selected', 'correct', 'incorrect', 'eliminated');
            btn.disabled = false;
        });
        
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.disabled = false;
        });
        
        document.getElementById('final-answer-btn').disabled = true;
    }

    // Lifeline methods
    useFiftyFifty() {
        if (!this.lifelinesAvailable['fifty-fifty']) return;
        
        this.lifelinesAvailable['fifty-fifty'] = false;
        const btn = document.getElementById('fifty-fifty');
        if (btn) btn.classList.add('used');
        
        // Remove 2 wrong answers
        const wrongAnswers = ['A', 'B', 'C', 'D'].filter(letter => 
            letter !== this.currentQuestion.correct
        );
        
        // Randomly select 2 wrong answers to eliminate
        const toEliminate = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, 2);
        
        toEliminate.forEach(letter => {
            const btn = document.querySelector(`[data-answer="${letter}"]`);
            btn.classList.add('eliminated');
            btn.disabled = true;
        });
        
        this.audioManager.playLifelineSound();
    }

    async usePhoneFriend() {
        if (!this.lifelinesAvailable['phone-friend']) return;
        
        this.lifelinesAvailable['phone-friend'] = false;
        const btn = document.getElementById('phone-friend');
        if (btn) btn.classList.add('used');
        
        const modal = document.getElementById('phone-friend-modal');
        const responseDiv = document.getElementById('friend-response');
        const adviceDiv = document.getElementById('friend-advice');
        const closeBtn = document.getElementById('close-phone');
        
        modal.classList.add('active');
        responseDiv.style.display = 'none';
        closeBtn.style.display = 'none';
        
        // Simulate calling
        setTimeout(async () => {
            const advice = await this.claudeAPI.generatePhoneFriendResponse(
                this.currentQuestion.question,
                this.currentQuestion.options,
                this.currentQuestion.correct
            );
            
            adviceDiv.textContent = advice;
            responseDiv.style.display = 'block';
            closeBtn.style.display = 'block';
        }, 3000);
    }

    useAskAudience() {
        if (!this.lifelinesAvailable['ask-audience']) return;
        
        this.lifelinesAvailable['ask-audience'] = false;
        const btn = document.getElementById('ask-audience');
        if (btn) btn.classList.add('used');
        
        const modal = document.getElementById('ask-audience-modal');
        const results = this.claudeAPI.generateAudienceResults(this.currentQuestion.correct);
        
        // Update audience results display
        Object.keys(results).forEach(letter => {
            const bar = document.querySelector(`.bar-${letter.toLowerCase()}`);
            const percentage = document.querySelector(`.audience-bar:nth-child(${['A','B','C','D'].indexOf(letter) + 1}) .percentage`);
            
            bar.style.width = `${results[letter]}%`;
            percentage.textContent = `${results[letter]}%`;
        });
        
        modal.classList.add('active');
        this.audioManager.playLifelineSound();
    }
}

// Export for use in other modules
window.GameLogic = GameLogic;