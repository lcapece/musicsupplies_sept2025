# Music Supplies Mobile - Deployment Guide

## Overview

This guide covers deploying the Music Supplies Mobile app to various platforms while keeping it completely separate from the desktop application.

## Prerequisites

- Node.js 18+
- Supabase project (shared with desktop app)
- Domain/subdomain for mobile app (e.g., `m.musicsupplies.com`)

## Environment Setup

### 1. Environment Variables

Copy the environment variables from your main project:

```bash
# Copy from main project
cp ../.env musicsupplies_mobile/.env
```

Or create manually:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Build Configuration

The mobile app is configured to run on port 3001 to avoid conflicts with the desktop app (port 3000).

## Deployment Options

### Option 1: Netlify (Recommended)

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify:**
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Add environment variables in Netlify dashboard

3. **Configure custom domain:**
   - Set up `m.musicsupplies.com` or similar
   - Enable HTTPS (automatic with Netlify)

### Option 2: Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

3. **Configure environment variables:**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```

### Option 3: AWS S3 + CloudFront

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Upload to S3:**
   - Create S3 bucket for mobile app
   - Enable static website hosting
   - Upload `dist` folder contents

3. **Configure CloudFront:**
   - Create distribution pointing to S3 bucket
   - Configure custom domain
   - Enable HTTPS

### Option 4: Self-Hosted (VPS/Dedicated Server)

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Serve with Nginx:**
   ```nginx
   server {
       listen 80;
       server_name m.musicsupplies.com;
       
       location / {
           root /var/www/musicsupplies-mobile;
           try_files $uri $uri/ /index.html;
       }
   }
   ```

## Mobile-Specific Considerations

### 1. PWA Configuration

Add to `public/manifest.json`:
```json
{
  "name": "Music Supplies Mobile",
  "short_name": "Music Supplies",
  "description": "Mobile app for Music Supplies customers",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#2563eb",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 2. Mobile Detection & Redirect

Add to your main website to redirect mobile users:

```javascript
// Add to main site's index.html
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
  if (!window.location.hostname.startsWith('m.')) {
    window.location.href = 'https://m.musicsupplies.com';
  }
}
```

### 3. iOS App-like Experience

The mobile app includes:
- Proper viewport configuration
- iOS safe area handling
- Add to home screen capability
- Touch-optimized interface

## Testing

### Local Testing
```bash
# Development server
npm run dev

# Production build testing
npm run build
npm run preview
```

### Mobile Device Testing
1. Connect mobile device to same network
2. Access `http://[your-ip]:3001`
3. Test on various devices and browsers

### Browser DevTools Testing
1. Open Chrome DevTools
2. Toggle device simulation
3. Test iPhone 14 Pro and other devices

## Performance Optimization

### 1. Bundle Analysis
```bash
npm run build -- --analyze
```

### 2. Image Optimization
- Use WebP format when possible
- Implement lazy loading
- Optimize for mobile bandwidth

### 3. Caching Strategy
- Configure proper cache headers
- Use service worker for offline capability

## Security Considerations

### 1. Environment Variables
- Never commit `.env` files
- Use platform-specific environment variable management
- Rotate keys regularly

### 2. HTTPS
- Always use HTTPS in production
- Configure proper SSL certificates
- Enable HSTS headers

### 3. Content Security Policy
Add to `index.html`:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
```

## Monitoring & Analytics

### 1. Error Tracking
Consider integrating:
- Sentry for error tracking
- LogRocket for session replay
- Google Analytics for usage tracking

### 2. Performance Monitoring
- Core Web Vitals tracking
- Mobile-specific performance metrics
- Network performance monitoring

## Maintenance

### 1. Updates
- Keep dependencies updated
- Monitor security vulnerabilities
- Test on new mobile OS versions

### 2. Backup Strategy
- Regular database backups (shared with desktop)
- Code repository backups
- Environment configuration backups

## Troubleshooting

### Common Issues

1. **Build Failures:**
   - Check Node.js version compatibility
   - Clear `node_modules` and reinstall
   - Verify environment variables

2. **Mobile Display Issues:**
   - Test viewport configuration
   - Check CSS media queries
   - Verify touch target sizes

3. **Authentication Issues:**
   - Verify Supabase configuration
   - Check CORS settings
   - Test session management

### Support

For deployment issues:
1. Check build logs
2. Verify environment variables
3. Test locally first
4. Contact hosting provider support if needed

## Rollback Plan

1. Keep previous build artifacts
2. Use deployment platform's rollback features
3. Have database backup strategy
4. Monitor error rates after deployment
