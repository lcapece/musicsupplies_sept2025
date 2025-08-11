import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { Send, X, Minimize2, MessageSquare, Users, Hash, AtSign } from 'lucide-react';

interface Message {
  id: number;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  type: 'public' | 'direct';
  recipientId?: string;
  recipientName?: string;
}

interface User {
  id: string;
  name: string;
}

interface ChatWidgetProps {
  serverUrl?: string;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ 
  serverUrl = import.meta.env.VITE_CHAT_SERVER_URL || 'http://localhost:3001' 
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [participationCode, setParticipationCode] = useState('');
  const [userName, setUserName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [roomUsers, setRoomUsers] = useState<User[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<'public' | string>('public');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showCodeEntry, setShowCodeEntry] = useState(true);
  const [showNameEntry, setShowNameEntry] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize socket connection
  const connectToChat = useCallback(() => {
    if (socketRef.current) return;

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to chat server');
      setIsConnected(true);
    });

    socket.on('room-joined', ({ users, participationCode: code }) => {
      setRoomUsers(users);
      setShowCodeEntry(false);
      setShowNameEntry(false);
      setMessages([{
        id: Date.now(),
        userId: 'system',
        userName: 'System',
        message: `Welcome to room ${code}!`,
        timestamp: new Date(),
        type: 'public'
      }]);
    });

    socket.on('user-joined', ({ user, users }) => {
      setRoomUsers(users);
      setMessages(prev => [...prev, {
        id: Date.now(),
        userId: 'system',
        userName: 'System',
        message: `${user.name} joined the chat`,
        timestamp: new Date(),
        type: 'public'
      }]);
    });

    socket.on('user-left', ({ userName: name }) => {
      setRoomUsers(prev => prev.filter(u => u.name !== name));
      setMessages(prev => [...prev, {
        id: Date.now(),
        userId: 'system',
        userName: 'System',
        message: `${name} left the chat`,
        timestamp: new Date(),
        type: 'public'
      }]);
    });

    socket.on('new-message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('new-direct-message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('user-typing', ({ userId, isTyping }) => {
      setTypingUsers(prev => {
        const updated = new Set(prev);
        if (isTyping) {
          updated.add(userId);
        } else {
          updated.delete(userId);
        }
        return updated;
      });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setIsConnected(false);
    });

    return socket;
  }, [serverUrl]);

  // Handle participation code submission
  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (participationCode.trim()) {
      if (user) {
        // Authenticated user - skip name entry
        setUserName(user.email || 'User');
        connectToChat();
        socketRef.current?.emit('join-room', {
          participationCode: participationCode.trim(),
          userName: user.email || 'User',
          isAuthenticated: true
        });
        setShowCodeEntry(false);
      } else {
        // Non-authenticated - show name entry
        setShowCodeEntry(false);
        setShowNameEntry(true);
      }
    }
  };

  // Handle name submission
  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      connectToChat();
      socketRef.current?.emit('join-room', {
        participationCode: participationCode.trim(),
        userName: userName.trim(),
        isAuthenticated: false
      });
    }
  };

  // Send message
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socketRef.current) return;

    if (selectedChannel === 'public') {
      socketRef.current.emit('send-message', {
        message: inputMessage,
        participationCode
      });
    } else {
      socketRef.current.emit('send-direct-message', {
        message: inputMessage,
        recipientId: selectedChannel
      });
    }
    
    setInputMessage('');
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!socketRef.current) return;
    
    socketRef.current.emit('typing', {
      participationCode,
      isTyping: true
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', {
        participationCode,
        isTyping: false
      });
    }, 1000);
  };

  // Sign out
  const handleSignOut = () => {
    if (socketRef.current) {
      socketRef.current.emit('sign-out');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setMessages([]);
    setRoomUsers([]);
    setParticipationCode('');
    setUserName('');
    setShowCodeEntry(true);
    setShowNameEntry(false);
    setIsOpen(false);
  };

  // Filter messages based on selected channel
  const filteredMessages = messages.filter(msg => {
    if (selectedChannel === 'public') {
      return msg.type === 'public';
    }
    return msg.type === 'direct' && 
           (msg.userId === selectedChannel || msg.recipientId === selectedChannel);
  });

  // Chat window dimensions
  const chatWidth = window.innerWidth / 8;
  const chatHeight = window.innerHeight / 2;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors z-50"
        aria-label="Open chat"
      >
        <MessageSquare size={24} />
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-2 flex items-center gap-2 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <MessageSquare size={20} />
          <span className="text-sm font-medium">Chat</span>
        </button>
        <button
          onClick={handleSignOut}
          className="text-gray-500 hover:text-red-600"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div 
      className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-2xl flex flex-col z-50"
      style={{ width: `${chatWidth}px`, height: `${chatHeight}px`, minWidth: '320px', minHeight: '400px' }}
    >
      {/* Header */}
      <div className="bg-purple-900 text-white p-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} />
          <span className="font-semibold">
            {isConnected ? `Room: ${participationCode}` : 'Chat'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="hover:bg-purple-800 p-1 rounded"
            aria-label="Minimize"
          >
            <Minimize2 size={16} />
          </button>
          <button
            onClick={handleSignOut}
            className="hover:bg-purple-800 p-1 rounded"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main content */}
      {showCodeEntry || showNameEntry ? (
        <div className="flex-1 flex items-center justify-center p-4">
          {showCodeEntry ? (
            <form onSubmit={handleCodeSubmit} className="w-full max-w-sm">
              <h3 className="text-lg font-semibold mb-4 text-center">
                {user ? 'Enter Participation Code' : 'Join Chat'}
              </h3>
              <input
                type="text"
                value={participationCode}
                onChange={(e) => setParticipationCode(e.target.value)}
                placeholder="Enter participation code"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 mb-3"
                autoFocus
              />
              <button
                type="submit"
                className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                {user ? 'Join Room' : 'Continue'}
              </button>
            </form>
          ) : showNameEntry ? (
            <form onSubmit={handleNameSubmit} className="w-full max-w-sm">
              <h3 className="text-lg font-semibold mb-4 text-center">Enter Your Name</h3>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 mb-3"
                autoFocus
              />
              <button
                type="submit"
                className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Join Chat
              </button>
            </form>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 bg-purple-50 border-r border-gray-200 flex flex-col">
            <div className="p-2 border-b border-gray-200">
              <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Channels</div>
              <button
                onClick={() => setSelectedChannel('public')}
                className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-1 ${
                  selectedChannel === 'public' ? 'bg-purple-200' : 'hover:bg-purple-100'
                }`}
              >
                <Hash size={14} />
                general
              </button>
            </div>
            <div className="p-2 flex-1 overflow-y-auto">
              <div className="text-xs font-semibold text-gray-600 uppercase mb-1 flex items-center gap-1">
                <Users size={12} />
                Direct Messages
              </div>
              {roomUsers.filter(u => u.id !== socketRef.current?.id).map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedChannel(user.id)}
                  className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-1 ${
                    selectedChannel === user.id ? 'bg-purple-200' : 'hover:bg-purple-100'
                  }`}
                >
                  <AtSign size={14} />
                  {user.name}
                </button>
              ))}
            </div>
            <div className="p-2 border-t border-gray-200">
              <button
                onClick={handleSignOut}
                className="w-full text-sm text-red-600 hover:bg-red-50 py-1 rounded"
              >
                Sign out of chat
              </button>
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${
                    msg.userId === 'system' ? 'text-center text-gray-500 text-xs' : ''
                  }`}
                >
                  {msg.userId !== 'system' && (
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 bg-purple-600 text-white rounded flex items-center justify-center text-xs font-semibold">
                        {msg.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{msg.userName}</span>
                          {msg.type === 'direct' && (
                            <span className="text-xs text-gray-500">
                              {msg.userId === socketRef.current?.id ? `→ ${msg.recipientName}` : '(Direct)'}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-sm text-gray-800">{msg.message}</div>
                      </div>
                    </div>
                  )}
                  {msg.userId === 'system' && msg.message}
                </div>
              ))}
              {typingUsers.size > 0 && (
                <div className="text-xs text-gray-500 italic">
                  Someone is typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-3 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder={`Message ${selectedChannel === 'public' ? '#general' : roomUsers.find(u => u.id === selectedChannel)?.name || ''}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 text-sm"
                />
                <button
                  type="submit"
                  className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition-colors"
                  disabled={!inputMessage.trim()}
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;