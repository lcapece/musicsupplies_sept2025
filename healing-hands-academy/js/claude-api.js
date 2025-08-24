// Claude API Integration for Question Generation

class ClaudeAPI {
    constructor() {
        this.apiKey = null; // API key should be set externally for security
        this.baseURL = 'https://api.anthropic.com/v1/messages';
        this.model = 'claude-3-opus-20240229';
        this.cache = new Map();
        this.useOfflineMode = true; // Default to offline mode for better reliability
    }

    async generateQuestions(difficulty, category, batchSize = 5) {
        const cacheKey = `${difficulty}-${category}-${batchSize}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // If offline mode is enabled or no API key, use fallback questions
        if (this.useOfflineMode || !this.apiKey) {
            console.log('Using offline mode - generating fallback questions');
            return this.getFallbackQuestions(difficulty, category, batchSize);
        }

        const prompt = this.buildPrompt(difficulty, category, batchSize);

        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 4000,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            const questions = this.parseResponse(data.content[0].text);
            
            // Cache the results
            this.cache.set(cacheKey, questions);
            
            return questions;
        } catch (error) {
            console.error('Error generating questions:', error);
            return this.getFallbackQuestions(difficulty, category, batchSize);
        }
    }

    buildPrompt(difficulty, category, batchSize) {
        const difficultyMap = {
            1: 'Very Easy - Basic terminology and simple concepts',
            2: 'Easy - Fundamental knowledge',
            3: 'Medium - Applied knowledge and practical scenarios',
            4: 'Hard - Complex clinical reasoning',
            5: 'Expert - Advanced pathology and comprehensive case studies'
        };

        const categoryMap = {
            'anatomy': 'Anatomy & Physiology',
            'kinesiology': 'Kinesiology & Movement',
            'pathology': 'Pathology & Recognition',
            'benefits': 'Benefits & Effects of Massage',
            'assessment': 'Assessment & Treatment Planning',
            'ethics': 'Professional Standards & Ethics'
        };

        return `Generate ${batchSize} multiple choice questions for massage therapy board exam preparation.

REQUIREMENTS:
- Difficulty: ${difficultyMap[difficulty]}
- Category: ${categoryMap[category]}
- Format: Multiple choice with 4 options (A, B, C, D)
- Include correct answer and detailed explanation
- Questions should be realistic MBLEX-style exam questions
- Vary question complexity within the difficulty level

Return ONLY a JSON array with this exact structure:
[
  {
    "question": "Question text here",
    "options": {
      "A": "First option",
      "B": "Second option", 
      "C": "Third option",
      "D": "Fourth option"
    },
    "correct": "B",
    "explanation": "Detailed explanation of why B is correct and why other options are wrong",
    "category": "${categoryMap[category]}",
    "difficulty": ${difficulty}
  }
]

Make questions engaging, clinically relevant, and appropriate for massage therapy students preparing for licensing exams.`;
    }

    parseResponse(responseText) {
        try {
            // Extract JSON from response
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            
            const questions = JSON.parse(jsonMatch[0]);
            
            // Validate question structure
            return questions.filter(q => 
                q.question && 
                q.options && 
                q.correct && 
                q.explanation &&
                Object.keys(q.options).length === 4
            );
        } catch (error) {
            console.error('Error parsing response:', error);
            return [];
        }
    }

    async getExplanation(question, userAnswer, correctAnswer, isOnline = true) {
        if (!isOnline) {
            return "Detailed explanation not available in offline mode.";
        }

        const prompt = `Provide a detailed explanation for this massage therapy question:

Question: ${question}
User's Answer: ${userAnswer}
Correct Answer: ${correctAnswer}

Explain:
1. Why the correct answer is right
2. Why the user's answer was wrong (if different)
3. Key concepts to remember
4. Any helpful mnemonics or study tips

Keep explanation clear, educational, and encouraging.`;

        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 1000,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            return data.content[0].text;
        } catch (error) {
            console.error('Error getting explanation:', error);
            return "Unable to load explanation at this time.";
        }
    }

    getFallbackQuestions(difficulty, category, batchSize) {
        // Fallback questions for offline mode or API failures
        const fallbackQuestions = {
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
                    category: "Anatomy & Physiology",
                    difficulty: difficulty
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
                    explanation: "Massage therapists must work within their scope of practice and refer clients to appropriate healthcare providers when needed.",
                    category: "Professional Standards & Ethics",
                    difficulty: difficulty
                }
            ]
        };

        const categoryQuestions = fallbackQuestions[category] || fallbackQuestions.anatomy;
        return categoryQuestions.slice(0, batchSize);
    }

    // Generate lifeline responses
    async generatePhoneFriendResponse(question, options, correctAnswer) {
        const prompt = `You are Dr. Sarah Mitchell, an experienced massage therapy instructor helping a student with a board exam question.

Question: ${question}
Options: ${JSON.stringify(options)}

Provide a realistic "phone a friend" response as if you're thinking through the question out loud. Sound like a knowledgeable but human instructor who might not be 100% certain. Give your reasoning and suggest an answer, but don't make it too obvious.

Keep response under 150 words and sound natural/conversational.`;

        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 200,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }]
                })
            });

            const data = await response.json();
            return data.content[0].text;
        } catch (error) {
            return "I think I'd go with option B on this one. The terminology sounds most familiar from our anatomy classes, but I'm not completely certain. Trust your instincts!";
        }
    }

    generateAudienceResults(correctAnswer) {
        // Generate realistic audience polling results
        const results = { A: 0, B: 0, C: 0, D: 0 };
        
        // Give correct answer higher probability but not too obvious
        const correctPercentage = 35 + Math.random() * 35; // 35-70%
        results[correctAnswer] = Math.round(correctPercentage);
        
        // Distribute remaining percentage among other options
        const remaining = 100 - results[correctAnswer];
        const options = ['A', 'B', 'C', 'D'].filter(opt => opt !== correctAnswer);
        
        let remainingPercent = remaining;
        for (let i = 0; i < options.length - 1; i++) {
            const maxPercent = remainingPercent - (options.length - 1 - i) * 5; // Ensure at least 5% for others
            const percent = Math.round(Math.random() * Math.max(maxPercent, 5));
            results[options[i]] = percent;
            remainingPercent -= percent;
        }
        results[options[options.length - 1]] = remainingPercent;
        
        return results;
    }
}

// Export for use in other modules
window.ClaudeAPI = ClaudeAPI;