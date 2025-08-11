# Chat System Setup Guide

## Overview
A simple, Slack-like chat system that allows authenticated customers and users with participation codes to communicate in real-time.

**Access Methods:**
- Direct URL: `https://yourdomain.com/chat`
- Subdomain: `https://chat.yourdomain.com` (requires DNS setup)
- Floating widget: Available on all pages via bottom-right chat icon

## Features
- **Participation Code Entry**: Non-authenticated users can join with a code
- **Authenticated Access**: Logged-in customers bypass code entry
- **Direct Messaging**: Send private messages to specific users
- **Public Channels**: Broadcast to all users in the same room
- **Minimizable Interface**: Shrink to icon or expand to chat window
- **Responsive Design**: 1/8 screen width, 50% height, lower-right corner
- **Slack-like UI**: Clean, familiar interface

## Architecture

### Frontend (React Component)
- `src/components/ChatWidget.tsx` - Main chat UI component
- Uses Socket.io client for real-time communication
- Integrated into main App.tsx

### Backend (Node.js Server)
- `server/chat-server.js` - WebSocket server using Socket.io
- Handles room management, messaging, and user tracking
- Runs on port 3001 by default

## Deployment Instructions

### Step 1: Deploy Chat Server (Choose one option)

#### Option A: Deploy to Render.com (Recommended - Free tier available)
1. Create account at https://render.com
2. Create new Web Service
3. Connect your GitHub repo
4. Configure:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Get your server URL (e.g., `https://your-app.onrender.com`)

#### Option B: Deploy to Railway.app
1. Create account at https://railway.app
2. Create new project from GitHub
3. Configure:
   - Root Directory: `server`
   - Start Command: `npm start`
4. Get your server URL

#### Option C: Deploy to Heroku
1. Install Heroku CLI
2. In server directory:
```bash
cd server
git init
heroku create your-chat-server-name
git add .
git commit -m "Initial commit"
git push heroku main
```

### Step 2: Configure Environment Variables

Add to your Netlify environment variables:
```
VITE_CHAT_SERVER_URL=https://your-chat-server.onrender.com
```

### Step 3: Set Up Subdomain

#### In Netlify:
1. Go to Domain Settings
2. Add domain alias: `chat.musicsupplies.com`
3. The netlify.toml already includes redirect rules

#### In Your DNS Provider:
Add CNAME record:
```
Type: CNAME
Name: chat
Value: your-netlify-site.netlify.app
```

OR if using Netlify DNS:
```
Type: CNAME
Name: chat
Value: musicsupplies.com
```

### Step 4: Test the System

1. **Local Testing**:
```bash
# Terminal 1 - Start chat server
cd server
npm install
npm start

# Terminal 2 - Start main app
npm run dev
```

2. **Production Testing**:
- Visit https://musicsupplies.com
- Log in as a customer
- Chat icon appears in bottom-right
- OR visit https://musicsupplies.com/chat directly
- OR visit https://chat.musicsupplies.com (after DNS setup)

## Usage

### For Customers (Authenticated):
1. Log into the main site
2. Click chat icon in bottom-right
3. Enter participation code
4. Start chatting

### For Non-Authenticated Users:
1. Click chat icon
2. Enter participation code
3. Enter your name
4. Start chatting

### Chat Features:
- **Public Messages**: Click #general channel
- **Direct Messages**: Click on a user's name
- **Minimize**: Click minimize button to shrink
- **Sign Out**: Click "Sign out of chat" button

## Participation Codes

Participation codes are room identifiers. Users entering the same code can chat together.

**Example codes**:
- `SALES2024` - For sales team
- `SUPPORT` - For customer support
- `DEMO` - For demonstrations
- Any custom code you share

## Security Considerations

1. **Authentication**: Integrated with existing Supabase auth
2. **CORS**: Configured for your domains only
3. **Input Validation**: Messages are sanitized
4. **SSL/TLS**: Ensure chat server uses HTTPS

## Troubleshooting

### Chat not connecting:
- Check VITE_CHAT_SERVER_URL environment variable
- Ensure chat server is running
- Check browser console for errors

### Subdomain not working:
- Verify DNS propagation (can take up to 48 hours)
- Check Netlify domain settings
- Ensure SSL certificate is provisioned

### Messages not sending:
- Check network connection
- Verify WebSocket connection in browser dev tools
- Check server logs

## Monitoring

Monitor your chat server health:
```
GET https://your-chat-server.onrender.com/health
```

Returns:
```json
{
  "status": "ok",
  "rooms": 5,
  "users": 23
}
```

## Customization

### Change Chat Position/Size:
Edit `ChatWidget.tsx`:
```typescript
const chatWidth = window.innerWidth / 8;  // Change divisor
const chatHeight = window.innerHeight / 2; // Change divisor
```

### Customize Colors:
Edit Tailwind classes in `ChatWidget.tsx` for purple theme.

### Add Features:
- File sharing: Add multer to server, file upload UI
- Emojis: Add emoji picker component
- Notifications: Add browser notification API
- Persistence: Add database to store message history