import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Minimize2, Mic, MicOff, Volume2, VolumeX, Bot, User, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { aiChatService } from '../services/aiChatService';
import ChatWidget from './ChatWidget'; // Fallback to existing chat for live mode

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  mode: 'live' | 'ai';
}

const EnhancedChatWidget: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatMode, setChatMode] = useState<'ai' | 'live'>('ai');
  const [isStaffAvailable, setIsStaffAvailable] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showLiveChat, setShowLiveChat] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Check staff availability on mount and periodically
  useEffect(() => {
    const checkAvailability = async () => {
      const available = await aiChatService.isStaffAvailable();
      setIsStaffAvailable(available);
    };

    checkAvailability();
    const interval = setInterval(checkAvailability, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add welcome message when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: isStaffAvailable 
          ? "Hello! Welcome to Music Supplies. Our receptionist is available to help you. How can we assist you today?"
          : "Hello! Welcome to Music Supplies. I'm your virtual assistant. How can I help you today? Ask me about our products, services, or store information!",
        timestamp: new Date(),
        mode: isStaffAvailable ? 'live' : 'ai'
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, isStaffAvailable]);

  // Handle sending message
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      mode: chatMode
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Check if user wants to speak to a human
      if (inputMessage.toLowerCase().includes('speak to') || 
          inputMessage.toLowerCase().includes('talk to') ||
          inputMessage.toLowerCase().includes('human') ||
          inputMessage.toLowerCase().includes('real person')) {
        
        if (isStaffAvailable) {
          setShowLiveChat(true);
          setChatMode('live');
          const systemMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'system',
            content: "Connecting you to our live receptionist...",
            timestamp: new Date(),
            mode: 'live'
          };
          setMessages(prev => [...prev, systemMessage]);
        } else {
          const systemMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: "I'm sorry, our live staff is not available right now. Our business hours are Monday-Friday 9am-6pm, Saturday 10am-4pm. Can I help you with something in the meantime?",
            timestamp: new Date(),
            mode: 'ai'
          };
          setMessages(prev => [...prev, systemMessage]);
        }
        setIsTyping(false);
        return;
      }

      // Get AI response
      const response = await aiChatService.sendMessage(
        inputMessage,
        user?.accountNumber,
        voiceEnabled
      );

      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: response.text,
        timestamp: new Date(),
        mode: response.mode
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Play audio if available
      if (response.audio && voiceEnabled) {
        await aiChatService.playAudioResponse(response.audio);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: "I apologize, but I'm having trouble responding right now. Please try again or call us at 1-800-MUSIC-99.",
        timestamp: new Date(),
        mode: 'ai'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Toggle voice input
  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Toggle voice output
  const toggleVoiceOutput = () => {
    setVoiceEnabled(!voiceEnabled);
    aiChatService.setVoiceEnabled(!voiceEnabled);
  };

  // If showing live chat, render the existing ChatWidget
  if (showLiveChat && isAuthenticated) {
    return <ChatWidget />;
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border border-purple-300 rounded-lg shadow-lg p-2 flex items-center gap-2 z-50">
        <button
          onClick={() => {
            setIsMinimized(false);
            setIsOpen(true);
          }}
          className="flex items-center gap-2 text-purple-700 hover:text-purple-900"
        >
          <Bot size={20} className="animate-pulse" />
          <span className="text-sm font-medium">Virtual Assistant</span>
        </button>
        <button
          onClick={() => {
            setIsOpen(false);
            setIsMinimized(false);
          }}
          className="text-gray-500 hover:text-red-600"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  // Closed state
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-full shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all transform hover:scale-110 z-50"
        aria-label="Open chat"
      >
        <div className="relative">
          <Bot size={28} />
          {isStaffAvailable && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
          )}
        </div>
      </button>
    );
  }

  // Main chat interface
  return (
    <div 
      className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-2xl flex flex-col z-50"
      style={{ width: '400px', height: '600px' }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-900 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bot size={24} />
            <div>
              <h3 className="font-semibold">Music Supplies Assistant</h3>
              <p className="text-xs text-purple-200">
                {isStaffAvailable ? 'Live staff available' : 'AI Assistant'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="hover:bg-purple-600 p-1 rounded"
              aria-label="Minimize"
            >
              <Minimize2 size={16} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-purple-600 p-1 rounded"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        
        {/* Voice controls */}
        <div className="flex items-center gap-2 pt-2 border-t border-purple-600">
          <button
            onClick={toggleVoiceOutput}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
              voiceEnabled ? 'bg-purple-600' : 'bg-purple-800'
            } hover:bg-purple-600 transition-colors`}
          >
            {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {voiceEnabled ? 'Voice On' : 'Voice Off'}
          </button>
          
          {isStaffAvailable && (
            <button
              onClick={() => setShowLiveChat(true)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-600 hover:bg-green-500 transition-colors"
            >
              <Phone size={14} />
              Talk to Staff
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-3 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start gap-2 max-w-[80%] ${
              message.role === 'user' ? 'flex-row-reverse' : ''
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : message.role === 'system'
                  ? 'bg-gray-500 text-white'
                  : 'bg-purple-600 text-white'
              }`}>
                {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.role === 'system'
                  ? 'bg-gray-200 text-gray-700 italic'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}>
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                  {message.mode === 'ai' && ' • AI'}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-center gap-2 text-gray-500">
            <Bot size={20} />
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleVoiceInput}
            className={`p-2 rounded-lg transition-colors ${
              isListening 
                ? 'bg-red-600 text-white animate-pulse' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            aria-label="Voice input"
          >
            {isListening ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message or click the mic..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            disabled={isListening}
          />
          
          <button
            type="submit"
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            disabled={!inputMessage.trim() || isTyping}
          >
            Send
          </button>
        </div>
        
        {!isAuthenticated && (
          <p className="text-xs text-gray-500 mt-2">
            Chat as a guest or <button className="text-purple-600 underline">log in</button> for full features
          </p>
        )}
      </form>
    </div>
  );
};

export default EnhancedChatWidget;