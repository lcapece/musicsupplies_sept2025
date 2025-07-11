# Music Supplies E-commerce Application - Code Index

## Project Overview
A React-based e-commerce application built with TypeScript, Vite, and Supabase. The application provides a B2B platform for music supplies with features including product catalog, shopping cart, discount management, and admin dashboard.

## Technology Stack
- **Frontend**: React 18.3.1, TypeScript 5.5.3, Vite 5.4.2
- **UI**: Tailwind CSS 3.4.1, Lucide React Icons
- **Backend**: Supabase (PostgreSQL, Edge Functions)
- **Authentication**: Custom auth system with Supabase
- **Routing**: React Router DOM 7.6.0
- **Additional**: OpenAI API integration, XLSX file handling

## Project Structure

### Root Configuration Files
- `package.json` - Node package configuration
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` - TypeScript configurations
- `vite.config.ts` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `eslint.config.js` - ESLint configuration
- `postcss.config.js` - PostCSS configuration
- `netlify.toml` - Netlify deployment configuration
- `Dockerfile` - Docker container configuration
- `nginx.conf` - Nginx web server configuration

### Main Application Entry Points
- `index.html` - HTML entry point
- `src/main.tsx` - React application entry point
- `src/App.tsx` - Main application component with routing

## Frontend Architecture

### Core Components (`src/components/`)

#### Authentication & User Management
- `Login.tsx` - User login component
- `PasswordChangeModal.tsx` - Password change functionality
- `LoginFixBanner.tsx` - Authentication fix notification banner

#### Product & Catalog
- `ProductTable.tsx` - Product listing display
- `CategoryTree.tsx` - Hierarchical category navigation
- `SearchBar.tsx` - Product search functionality
- `ProductImportModal.tsx` - Product import interface

#### Shopping & Orders
- `ShoppingCart.tsx` - Shopping cart functionality
- `OrderConfirmationModal.tsx` - Order confirmation display
- `PromoCodePopup.tsx` - Promo code entry interface
- `ActiveDiscountDisplayModal.tsx` - Active discount display
- `DiscountFormModal.tsx` - Discount application form

#### Communication & Notifications
- `NotificationModal.tsx` - System notifications
- `SmsConsentModal.tsx` - SMS consent management
- `PromotionalPopupModal.tsx` - Promotional popup display

#### Layout & Navigation
- `Header.tsx` - Application header
- `Dashboard.tsx` - Main dashboard component
- `ErrorBoundary.tsx` - Error handling wrapper

### Admin Components (`src/components/admin/`)

#### Account Management
- `AccountManagementTab.tsx` - Account management interface
- `AccountsTab.tsx` - Account listing
- `AccountApplicationsTab.tsx` - Account application processing
- `AddPromoCodeModal.tsx` - Create new promo codes
- `EditPromoCodeModal.tsx` - Edit existing promo codes

#### Product & Catalog Management
- `ProductManagementTab.tsx` - Product management interface
- `ProductsTab.tsx` - Product administration
- `CategoryManagementTab.tsx` - Category management
- `ProductGroupManagementTab.tsx` - Product group management
- `ManageTreeviewTab.tsx` - Tree view management
- `MissingSubgroupsTab.tsx` - Missing subgroups tracking

#### Order & Discount Management
- `OrderManagementTab.tsx` - Order management interface
- `OrderHistoryTab.tsx` - Order history viewing
- `DiscountManagementTab.tsx` - Discount management
- `PromoCodeManagementTab.tsx` - Promo code administration

#### Communication & Settings
- `EmailTab.tsx` - Email configuration
- `SmsNotificationTab.tsx` - SMS notification settings
- `ClickSendTab.tsx` - ClickSend SMS integration
- `GeneralSettingsTab.tsx` - General system settings

#### System Administration
- `DataSyncTab.tsx` - Data synchronization
- `SystemAnalyticsTab.tsx` - System analytics dashboard
- `HistoryTab.tsx` - System history logs
- `UnresolvedIssuesTab.tsx` - Issue tracking
- `IconGenerationTab.tsx` - Icon generation utilities
- `ManagementTab.tsx` - General management interface

### Pages (`src/pages/`)

#### Public Pages
- `Dashboard.tsx` - Main customer dashboard
- `PrivacyPolicyPage.tsx` - Privacy policy
- `NewAccountApplicationPage.tsx` - New account registration
- `ForgotPasswordPage.tsx` - Password recovery

#### Customer Pages
- `CustomerAccountPage.tsx` - Customer account management
- `OrderHistory.tsx` - Customer order history
- `WebOrdersDisplay.tsx` - Web orders display

#### Admin Pages
- `AdminDashboard.tsx` - Admin control panel
- `AdminAccountApplicationsPage.tsx` - Account application review
- `SkuImportPage.tsx` - SKU import interface (special admin)

#### Communication Pages
- `EmailCommunicationsPage.tsx` - Email communication preferences
- `SmsCommunicationsPage.tsx` - SMS communication preferences

### Context Providers (`src/context/`)
- `AuthContext.tsx` - Authentication state management
- `CartContext.tsx` - Shopping cart state management
- `NotificationContext.tsx` - Notification state management

### Type Definitions (`src/types/index.ts`)
Key interfaces:
- `Category` - Product category structure
- `Product` - Product data model
- `CartItem` - Shopping cart item
- `Account` - Account information
- `User` - User profile data
- `ProductGroup` - Product grouping structure
- `OrderConfirmationDetails` - Order confirmation data
- `PromoCode` - Promotional code structure
- `PromoCodeUsage` - Promo code usage tracking
- `PromoCodeValidity` - Promo code validation result

### Utilities (`src/utils/`)
- `applyMigration.ts` - Database migration utilities
- `applyPromoCodeLimitsUpdates.ts` - Promo code limit updates
- `checkDbUpdate.ts` - Database update checking
- `iconGenerator.ts` - Icon generation utilities

### Libraries (`src/lib/`)
- `supabase.ts` - Supabase client configuration
- `errorReporting.ts` - Error reporting utilities

### Data (`src/data/`)
- `categoryTree.ts` - Category tree data structure
- `mockData.ts` - Mock data for development

## Backend Architecture

### Supabase Functions (`supabase/functions/`)

#### Promotional Functions
- `assign-introductory-promo-to-account/` - Assign intro promos to accounts
- `get-applicable-intro-promo/` - Get applicable intro promotions
- `get-promotional-offers-status/` - Check promotional offer status
- `record-intro-promo-usage/` - Record promo code usage

#### Communication Functions
- `send-mailgun-email/` - Email sending via Mailgun
- `send-order-sms/` - SMS notifications for orders

#### Shared Utilities
- `_shared/cors.ts` - CORS configuration for edge functions

### Database Migrations (`supabase/migrations/`)
The project contains 80+ migration files managing:
- Account and authentication system
- Product catalog structure
- Order management
- Discount and promo code system
- SMS verification
- Tree view data structures
- Row-level security policies
- Various bug fixes and optimizations

Key migration patterns:
- Account management (20250516-20250701)
- Authentication improvements (20250602-20250629)
- Product structure updates (20250603-20250610)
- Promo code system (20250623-20250710)
- RLS policies (20250617-20250620)

## Key Features

### Authentication System
- Custom authentication with account numbers and email
- Password requirements and change enforcement
- Special admin accounts (99, 999)
- Session management with Supabase

### Product Management
- Two-level category structure (main/sub)
- Product search and filtering
- Inventory tracking
- Brand and MAP pricing support
- Bulk import capabilities

### Shopping Cart & Orders
- Real-time cart management
- Order confirmation and history
- Web order tracking
- Invoice generation

### Discount System
- Percentage and dollar-off discounts
- Promo code management
- Account-specific usage limits
- Minimum order requirements
- Time-based validity

### Communication
- Email notifications via Mailgun
- SMS notifications via ClickSend
- Consent management
- Promotional messaging

### Admin Features
- Comprehensive dashboard
- Account application review
- Product and category management
- Order tracking and management
- System analytics
- Issue tracking

## Build & Deployment
- Development: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Preview: `npm run preview`

## Security Features
- Row-level security (RLS) policies
- Password hashing
- Session management
- CORS configuration
- Environment-based configuration

## Notable Integrations
- OpenAI API for AI features
- Mailgun for email services
- ClickSend for SMS services
- XLSX for spreadsheet import/export