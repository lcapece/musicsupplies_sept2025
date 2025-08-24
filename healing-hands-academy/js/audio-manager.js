// Audio Manager for Who Wants to be a Massage Millionaire

class AudioManager {
    constructor() {
        this.isEnabled = true;
        this.volume = 0.7;
        this.sounds = {};
        this.currentMusic = null;
        
        this.initializeSounds();
        this.loadSettings();
    }

    initializeSounds() {
        // Create audio elements programmatically for better control
        this.sounds = {
            intro: this.createAudio('assets/audio/intro.mp3', true),
            question: this.createAudio('assets/audio/question.mp3', true),
            finalAnswer: this.createAudio('assets/audio/final-answer.mp3'),
            correct: this.createAudio('assets/audio/correct.mp3'),
            wrong: this.createAudio('assets/audio/wrong.mp3'),
            millionaire: this.createAudio('assets/audio/millionaire.mp3'),
            lifeline: this.createAudio('assets/audio/lifeline.mp3'),
            select: this.createAudio('assets/audio/select.mp3'),
            suspense: this.createAudio('assets/audio/suspense.mp3'),
            walkAway: this.createAudio('assets/audio/walk-away.mp3')
        };

        // Set initial volumes
        Object.values(this.sounds).forEach(audio => {
            audio.volume = this.volume;
        });
    }

    createAudio(src, loop = false) {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.loop = loop;
        
        // Try to load the audio file, use Web Audio API for fallback sounds if needed
        audio.src = src;
        
        audio.addEventListener('error', () => {
            console.warn(`Could not load audio file: ${src}`);
            // Could implement synthetic audio generation here
        });

        return audio;
    }

    // Create synthetic sounds using Web Audio API as fallbacks
    createSyntheticSound(type) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const soundPatterns = {
            correct: () => this.createTone(audioContext, 800, 0.2, 'sine'),
            wrong: () => this.createBuzz(audioContext, 200, 0.5),
            select: () => this.createTone(audioContext, 440, 0.1, 'sine'),
            lifeline: () => this.createChord(audioContext, [440, 554, 659], 0.3)
        };

        return soundPatterns[type] ? soundPatterns[type]() : null;
    }

    createTone(audioContext, frequency, duration, waveType = 'sine') {
        return () => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = waveType;
            
            gainNode.gain.setValueAtTime(this.volume * 0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        };
    }

    createBuzz(audioContext, frequency, duration) {
        return () => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sawtooth';
            
            gainNode.gain.setValueAtTime(this.volume * 0.2, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        };
    }

    createChord(audioContext, frequencies, duration) {
        return () => {
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.value = freq;
                    oscillator.type = 'sine';
                    
                    gainNode.gain.setValueAtTime(this.volume * 0.2, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                    
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + duration);
                }, index * 100);
            });
        };
    }

    playSound(soundName) {
        if (!this.isEnabled) return;

        const sound = this.sounds[soundName];
        if (sound && sound.play) {
            // Reset audio to beginning
            sound.currentTime = 0;
            
            const playPromise = sound.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn(`Could not play sound ${soundName}:`, error);
                    // Try synthetic fallback
                    const synthetic = this.createSyntheticSound(soundName);
                    if (synthetic) synthetic();
                });
            }
        } else {
            // Try synthetic fallback
            const synthetic = this.createSyntheticSound(soundName);
            if (synthetic) synthetic();
        }
    }

    playMusic(musicName) {
        if (!this.isEnabled) return;

        // Stop current music
        this.stopCurrentMusic();

        const music = this.sounds[musicName];
        if (music && music.play) {
            this.currentMusic = music;
            music.volume = this.volume * 0.6; // Background music should be quieter
            
            const playPromise = music.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn(`Could not play music ${musicName}:`, error);
                });
            }
        }
    }

    stopCurrentMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            this.currentMusic = null;
        }
    }

    // Specific sound methods for game events
    playIntroMusic() {
        this.playMusic('intro');
    }

    playQuestionMusic() {
        this.playMusic('question');
    }

    stopQuestionMusic() {
        if (this.currentMusic === this.sounds.question) {
            this.stopCurrentMusic();
        }
    }

    playFinalAnswerSound() {
        this.stopCurrentMusic();
        this.playSound('finalAnswer');
    }

    playCorrectSound() {
        this.playSound('correct');
    }

    playWrongSound() {
        this.playSound('wrong');
    }

    playMillionaireSound() {
        this.stopCurrentMusic();
        this.playSound('millionaire');
    }

    playLifelineSound() {
        this.playSound('lifeline');
    }

    playSelectSound() {
        this.playSound('select');
    }

    playSuspenseMusic() {
        this.playMusic('suspense');
    }

    playWalkAwaySound() {
        this.stopCurrentMusic();
        this.playSound('walkAway');
    }

    // Settings management
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        
        Object.values(this.sounds).forEach(audio => {
            if (audio.volume !== undefined) {
                audio.volume = this.volume;
            }
        });

        this.saveSettings();
    }

    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        if (!enabled) {
            this.stopCurrentMusic();
        }

        this.saveSettings();
    }

    saveSettings() {
        localStorage.setItem('massageMillionaire_audioSettings', JSON.stringify({
            volume: this.volume,
            enabled: this.isEnabled
        }));
    }

    loadSettings() {
        try {
            const settings = localStorage.getItem('massageMillionaire_audioSettings');
            if (settings) {
                const parsed = JSON.parse(settings);
                this.volume = parsed.volume || 0.7;
                this.isEnabled = parsed.enabled !== false;
            }
        } catch (error) {
            console.warn('Could not load audio settings:', error);
        }
    }

    // Preload critical sounds
    preloadSounds() {
        const criticalSounds = ['finalAnswer', 'correct', 'wrong', 'select'];
        
        criticalSounds.forEach(soundName => {
            const sound = this.sounds[soundName];
            if (sound && sound.load) {
                sound.load();
            }
        });
    }
}

// Export for use in other modules
window.AudioManager = AudioManager;