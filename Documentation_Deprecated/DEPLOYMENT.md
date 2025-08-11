# Netlify Deployment Guide

## Option 1: Static Site Deployment (Recommended)

This is the simplest and most cost-effective approach for React applications.

### Steps:

1. **Prepare Your Repository**
   ```bash
   # Make sure all changes are committed
   git add .
   git commit -m "Prepare for Netlify deployment"
   git push origin main
   ```

2. **Deploy to Netlify**
   
   **Method A: Connect GitHub Repository**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "New site from Git"
   - Choose your Git provider (GitHub)
   - Select your repository: `git_musicsupplies_v4`
   - Build settings (auto-detected from `netlify.toml`):
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
   - Click "Deploy site"

   **Method B: Manual Deploy**
   ```bash
   # Build the project locally
   npm run build
   
   # Install Netlify CLI
   npm install -g netlify-cli
   
   # Deploy
   netlify deploy --prod --dir=dist
   ```

3. **Set Environment Variables**
   - In Netlify Dashboard → Site Settings → Environment Variables
   - Add these variables:
     ```
     VITE_SUPABASE_URL = https://ekklokrukxmqlahtonnc.supabase.co
     VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k
     ```

---

## Option 2: Container Deployment

Use this if you need more control or want to run the app in a containerized environment.

### Prerequisites:
- Docker installed locally
- Netlify CLI with container support

### Steps:

1. **Build Docker Image**
   ```bash
   # Build the Docker image
   docker build -t musicsupplies-app .
   
   # Test locally
   docker run -p 8080:80 musicsupplies-app
   ```

2. **Deploy Container to Netlify**
   ```bash
   # Install Netlify CLI if not already installed
   npm install -g netlify-cli
   
   # Login to Netlify
   netlify login
   
   # Deploy container
   netlify deploy --build
   ```

3. **Alternative: Deploy to Container Platforms**
   
   **Deploy to Railway:**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway init
   railway up
   ```
   
   **Deploy to Render:**
   - Connect your GitHub repository
   - Choose "Docker" as deployment method
   - Set build command: `docker build -t app .`

---

## Environment Variables for Production

Make sure to set these in your deployment platform:

```env
VITE_SUPABASE_URL=https://ekklokrukxmqlahtonnc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k
```

---

## Post-Deployment Checklist

1. **Database Setup**
   - Run the SQL from `fix_login_manual.sql` in your Supabase dashboard
   - Test login with account 101 using "Monday123$" or "a11803"

2. **Domain Configuration**
   - Set up custom domain in Netlify (if needed)
   - Configure SSL (automatic with Netlify)

3. **Performance Optimization**
   - Enable Netlify's CDN (automatic)
   - Configure caching headers (already set in `netlify.toml`)

4. **Monitoring**
   - Set up Netlify Analytics
   - Monitor Supabase usage and performance

---

## Troubleshooting

### Build Fails
```bash
# Check if build works locally
npm run build

# Check Node.js version
node --version  # Should be 18+
```

### Environment Variables Not Working
- Ensure variables start with `VITE_`
- Restart deployment after adding variables
- Check browser dev tools for undefined variables

### Routing Issues
- Verify `netlify.toml` redirects are configured
- Check React Router setup

---

## Quick Deploy Commands

```bash
# Option 1: Static Deploy
npm run build
netlify deploy --prod --dir=dist

# Option 2: Container Deploy  
docker build -t musicsupplies-app .
docker run -p 8080:80 musicsupplies-app
```

**Recommended**: Use **Option 1 (Static Site)** for faster builds, better performance, and lower costs.
