# Music Supplies Mobile

A mobile-optimized web application for Music Supplies customers, built with React, TypeScript, and Tailwind CSS.

## Features

- **Mobile-First Design**: Optimized for iPhone 14+ and modern mobile devices
- **Touch-Friendly Interface**: Large touch targets and intuitive gestures
- **Product Browsing**: Search and browse products with mobile-optimized cards
- **Shopping Cart**: Add, remove, and manage cart items
- **User Authentication**: Secure login with account number or email
- **Account Management**: View account details and settings
- **Responsive Layout**: Adapts to different screen sizes

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS with mobile-first approach
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Backend**: Supabase (shared with desktop app)
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository and navigate to the mobile app:
   ```bash
   cd musicsupplies_mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser to `http://localhost:3001`

## Mobile Testing

### Browser DevTools
1. Open Chrome DevTools (F12)
2. Click the device toggle icon (mobile/tablet icon)
3. Select "iPhone 14 Pro" or similar device
4. Refresh the page

### Physical Device Testing
1. Ensure your mobile device is on the same network
2. Access `http://[your-ip]:3001` from your mobile browser
3. For iOS: Add to home screen for app-like experience

## Project Structure

```
musicsupplies_mobile/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Page components
│   │   ├── Login.tsx       # Mobile login page
│   │   ├── Dashboard.tsx   # Product browsing
│   │   ├── ProductDetail.tsx # Product details
│   │   ├── Cart.tsx        # Shopping cart
│   │   └── Account.tsx     # Account management
│   ├── context/            # React contexts
│   │   ├── AuthContext.tsx # Authentication
│   │   └── CartContext.tsx # Shopping cart
│   ├── lib/                # External libraries
│   │   └── supabase.ts     # Supabase client
│   ├── types/              # TypeScript types
│   ├── utils/              # Utility functions
│   └── index.css           # Mobile-first styles
├── public/                 # Static assets
└── package.json           # Dependencies
```

## Mobile-Specific Features

### Touch Optimization
- Minimum 44px touch targets (Apple guidelines)
- Touch-friendly buttons and controls
- Swipe gestures support

### Performance
- Lazy loading for better mobile performance
- Optimized images and assets
- Minimal bundle size

### iOS Integration
- PWA capabilities
- Add to home screen support
- iOS safe area handling
- Proper viewport configuration

## Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Deploy to Netlify/Vercel
1. Build the project: `npm run build`
2. Deploy the `dist` folder
3. Configure environment variables in your hosting platform

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |

## Browser Support

- iOS Safari 14+
- Chrome Mobile 90+
- Firefox Mobile 90+
- Samsung Internet 14+

## Contributing

1. Follow mobile-first design principles
2. Test on actual mobile devices
3. Ensure touch targets meet accessibility guidelines
4. Optimize for performance on slower mobile networks

## License

© 2025 Lou Capece Music Distributors
