// Question Generator for Who Wants to be a Massage Millionaire
// This module handles question generation and management

class QuestionGenerator {
    constructor() {
        this.claudeAPI = new ClaudeAPI();
        this.questionPool = new Map();
        this.fallbackQuestions = this.initializeFallbackQuestions();
    }

    async generateQuestionBatch(difficulty, category, count = 5) {
        const cacheKey = `${difficulty}-${category}`;
        
        try {
            // Try to get fresh questions from Claude API
            const questions = await this.claudeAPI.generateQuestions(difficulty, category, count);
            
            if (questions && questions.length > 0) {
                // Cache the questions
                if (!this.questionPool.has(cacheKey)) {
                    this.questionPool.set(cacheKey, []);
                }
                this.questionPool.get(cacheKey).push(...questions);
                return questions;
            }
        } catch (error) {
            console.warn('Failed to generate questions via API, using fallbacks:', error);
        }
        
        // Fallback to local questions
        return this.getFallbackQuestions(difficulty, category, count);
    }

    getFallbackQuestions(difficulty, category, count) {
        const categoryQuestions = this.fallbackQuestions[category] || this.fallbackQuestions.anatomy;
        return categoryQuestions.slice(0, count).map(q => ({
            ...q,
            difficulty: difficulty
        }));
    }

    initializeFallbackQuestions() {
        return {
            anatomy: [
                {
                    question: "Which muscle is primarily responsible for shoulder blade retraction?",
                    options: {
                        A: "Serratus anterior",
                        B: "Rhomboids", 
                        C: "Pectoralis minor",
                        D: "Latissimus dorsi"
                    },
                    correct: "B",
                    explanation: "The rhomboids (major and minor) are the primary muscles responsible for retracting the shoulder blades toward the spine.",
                    category: "Anatomy & Physiology"
                },
                {
                    question: "What is the origin of the biceps brachii muscle?",
                    options: {
                        A: "Humerus",
                        B: "Radius and ulna",
                        C: "Scapula",
                        D: "Clavicle"
                    },
                    correct: "C",
                    explanation: "The biceps brachii originates from two points on the scapula: the coracoid process (short head) and the supraglenoid tubercle (long head).",
                    category: "Anatomy & Physiology"
                }
            ],
            kinesiology: [
                {
                    question: "Which type of joint movement occurs in the sagittal plane?",
                    options: {
                        A: "Rotation",
                        B: "Abduction/Adduction",
                        C: "Flexion/Extension", 
                        D: "Circumduction"
                    },
                    correct: "C",
                    explanation: "Flexion and extension movements occur in the sagittal plane, dividing the body into left and right halves.",
                    category: "Kinesiology & Movement"
                }
            ],
            pathology: [
                {
                    question: "What is a contraindication for massage in acute inflammation?",
                    options: {
                        A: "The area will be too sensitive",
                        B: "Massage may spread infection",
                        C: "It may increase circulation and worsen inflammation",
                        D: "All of the above"
                    },
                    correct: "D",
                    explanation: "All options are valid concerns. Acute inflammation is a contraindication for direct massage due to sensitivity, potential infection spread, and increased circulation that could worsen the condition.",
                    category: "Pathology & Recognition"
                }
            ],
            benefits: [
                {
                    question: "Which of the following is a primary benefit of effleurage?",
                    options: {
                        A: "Deep tissue penetration",
                        B: "Breaking up scar tissue",
                        C: "Improving circulation and relaxation",
                        D: "Trigger point release"
                    },
                    correct: "C",
                    explanation: "Effleurage is a long, gliding stroke that primarily improves circulation and promotes relaxation. It's often used at the beginning and end of massage sessions.",
                    category: "Benefits & Effects of Massage"
                }
            ],
            assessment: [
                {
                    question: "What should be included in a thorough intake assessment?",
                    options: {
                        A: "Medical history only",
                        B: "Current symptoms only", 
                        C: "Medical history, current symptoms, and treatment goals",
                        D: "Treatment goals only"
                    },
                    correct: "C",
                    explanation: "A comprehensive intake assessment should include medical history, current symptoms, and treatment goals to ensure safe and effective treatment planning.",
                    category: "Assessment & Treatment Planning"
                }
            ],
            ethics: [
                {
                    question: "What is the most appropriate action when a client asks for treatment outside your scope of practice?",
                    options: {
                        A: "Attempt the treatment if you feel confident",
                        B: "Decline and refer to an appropriate healthcare provider",
                        C: "Research the technique online first",
                        D: "Ask another massage therapist for advice"
                    },
                    correct: "B",
                    explanation: "Massage therapists must work within their scope of practice and refer clients to appropriate healthcare providers when treatment is outside their scope.",
                    category: "Professional Standards & Ethics"
                },
                {
                    question: "How should confidential client information be handled?",
                    options: {
                        A: "Share only with other massage therapists",
                        B: "Keep private except when required by law",
                        C: "Discuss freely to help other clients", 
                        D: "Share with family members if concerned"
                    },
                    correct: "B",
                    explanation: "Client confidentiality must be maintained at all times, with exceptions only when required by law (such as reporting suspected abuse or communicable diseases).",
                    category: "Professional Standards & Ethics"
                }
            ]
        };
    }

    getQuestionsByDifficulty(difficulty) {
        const allQuestions = [];
        Object.values(this.fallbackQuestions).forEach(categoryQuestions => {
            allQuestions.push(...categoryQuestions.map(q => ({
                ...q,
                difficulty: difficulty
            })));
        });
        return allQuestions;
    }

    getQuestionsByCategory(category) {
        return this.fallbackQuestions[category] || [];
    }

    // Shuffle array utility
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

// Export for use in other modules
window.QuestionGenerator = QuestionGenerator;