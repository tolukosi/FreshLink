# FreshLink - Local Food Marketplace

## Overview

FreshLink is a location-aware marketplace connecting local food producers directly with consumers and businesses. The application enables farmers, artisans, and local food producers to sell their products digitally while giving consumers easy access to fresh, local, sustainable food. The platform starts in Melfort, Saskatchewan, with plans for global expansion.

The system features a full-stack TypeScript application with a React frontend, Express.js backend, and PostgreSQL database. It includes user authentication, location-based product discovery, shopping cart functionality, payment processing via Stripe, and separate interfaces for consumers, producers, and businesses.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **Routing**: Wouter for client-side routing with pages for home, authentication, producer dashboard, and checkout
- **UI Components**: Shadcn/ui component library with Radix UI primitives and Tailwind CSS for styling
- **State Management**: TanStack Query for server state management and caching
- **Authentication**: Context-based auth provider with session management

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Session Management**: Express-session with connect-pg-simple for PostgreSQL session storage
- **Authentication**: Passport.js with local strategy and bcrypt for password hashing
- **API Design**: RESTful API with structured error handling and request logging

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon serverless PostgreSQL for cloud database hosting
- **Schema**: Comprehensive schema including users, producers, products, orders, cart items, and reviews
- **Migrations**: Drizzle Kit for database migrations and schema management

### Payment Processing
- **Provider**: Stripe for payment processing with both standard and Connect accounts
- **Implementation**: Stripe Elements for secure payment forms and webhook handling
- **Fee Structure**: Platform commission (5%) plus Stripe fees (2.9% + $0.30)
- **Producer Payouts**: Stripe Connect for direct producer payments

### Location Services
- **Geolocation**: Browser Geolocation API for user location detection
- **Distance Calculation**: Haversine formula for calculating distances between locations
- **Location Storage**: PostGIS point data type for efficient spatial queries
- **Search**: Location-based product discovery with configurable radius

### Authentication & Authorization
- **Strategy**: Session-based authentication with role-based access control
- **Roles**: Three user types - consumer, producer, and business
- **Security**: Password hashing with bcrypt and secure session management
- **Profile Management**: Progressive profile completion tracking

## External Dependencies

### Payment Services
- **Stripe**: Payment processing, subscription management, and Connect for marketplace payouts
- **Configuration**: Requires STRIPE_SECRET_KEY and VITE_STRIPE_PUBLIC_KEY environment variables

### Database Services  
- **Neon PostgreSQL**: Serverless PostgreSQL hosting with connection pooling
- **Configuration**: Requires DATABASE_URL environment variable for database connection

### Development Tools
- **Vite**: Fast development server with hot module replacement
- **Replit Integration**: Runtime error overlay and cartographer plugin for Replit environment
- **TypeScript**: Type checking and development tooling

### UI and Styling
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Radix UI**: Headless UI components for accessibility and functionality
- **Lucide React**: Icon library for consistent iconography
- **Google Fonts**: Inter font family for typography

### Build and Deployment
- **ESBuild**: Fast bundling for production server build
- **PostCSS**: CSS processing with Tailwind and Autoprefixer
- **Development**: Hot reloading with Vite middleware integration
- **Production**: Static asset serving with Express

The application follows a mobile-first responsive design approach with a focus on Saskatchewan's agricultural market, featuring location-aware product discovery, real-time inventory management, and integrated payment processing for a complete farm-to-consumer marketplace experience.