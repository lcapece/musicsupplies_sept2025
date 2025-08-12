const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: ["http://localhost:5173", "https://musicsupplies.com", "https://chat.musicsupplies.com"],
    methods: ["GET", "POST"]
  }
});

// Store active rooms and users
const rooms = new Map();
const users = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join room with participation code (always LCMD for logged-in users)
  socket.on('join-room', ({ participationCode, userName, isAuthenticated, accountNumber, userRole }) => {
    const roomId = `room-${participationCode}`;
    socket.join(roomId);

    // Store user info with role
    const userInfo = {
      id: socket.id,
      name: userName,
      room: roomId,
      participationCode,
      isAuthenticated,
      accountNumber,
      role: userRole || 'customer',
      joinedAt: new Date()
    };
    users.set(socket.id, userInfo);

    // Add user to room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(socket.id);

    // Get all users in room with their roles
    const roomUsers = Array.from(rooms.get(roomId)).map(id => {
      const user = users.get(id);
      return { 
        id: user.id, 
        name: user.name,
        accountNumber: user.accountNumber,
        role: user.role
      };
    });

    // Notify room of new user
    socket.to(roomId).emit('user-joined', {
      user: { 
        id: socket.id, 
        name: userName,
        accountNumber: accountNumber,
        role: userRole
      },
      users: roomUsers
    });

    // Send room info to new user
    socket.emit('room-joined', {
      roomId,
      users: roomUsers,
      participationCode
    });

    console.log(`${userName} (${userRole}) joined room ${participationCode}`);
  });

  // Handle public messages (including "everyone" type)
  socket.on('send-message', ({ message, participationCode, type }) => {
    const user = users.get(socket.id);
    if (!user) return;

    const messageData = {
      id: Date.now(),
      userId: socket.id,
      userName: user.name,
      message,
      timestamp: new Date(),
      type: type || 'public' // Support both 'public' and 'everyone' types
    };

    // Send to all in room including sender
    io.to(user.room).emit('new-message', messageData);
  });

  // Handle direct messages
  socket.on('send-direct-message', ({ message, recipientId }) => {
    const sender = users.get(socket.id);
    const recipient = users.get(recipientId);
    
    if (!sender || !recipient) return;

    const messageData = {
      id: Date.now(),
      userId: socket.id,
      userName: sender.name,
      recipientId,
      recipientName: recipient.name,
      message,
      timestamp: new Date(),
      type: 'direct'
    };

    // Send to recipient
    io.to(recipientId).emit('new-direct-message', messageData);
    // Send confirmation to sender
    socket.emit('new-direct-message', messageData);
  });

  // Handle typing indicator
  socket.on('typing', ({ participationCode, isTyping }) => {
    const user = users.get(socket.id);
    if (!user) return;

    socket.to(user.room).emit('user-typing', {
      userId: socket.id,
      userName: user.name,
      isTyping
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      // Remove from room
      const room = rooms.get(user.room);
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
          rooms.delete(user.room);
        } else {
          // Notify others in room
          socket.to(user.room).emit('user-left', {
            userId: socket.id,
            userName: user.name
          });
        }
      }
      users.delete(socket.id);
      console.log(`${user.name} disconnected`);
    }
  });

  // Handle explicit sign out (not used in new system)
  socket.on('sign-out', () => {
    socket.disconnect();
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const userList = Array.from(users.values()).map(u => ({
    name: u.name,
    role: u.role,
    room: u.participationCode
  }));
  
  res.json({ 
    status: 'ok', 
    rooms: rooms.size, 
    users: users.size,
    activeUsers: userList
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Chat server running on port ${PORT}`);
});