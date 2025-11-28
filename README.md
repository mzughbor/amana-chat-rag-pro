# AmanaRAG - BYOK RAG-Based Chatbot Platform

A modern, full-stack chatbot platform that enables businesses to create intelligent AI assistants powered by RAG (Retrieval-Augmented Generation) technology. Built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

### Core Functionality
- **BYOK (Bring Your Own Key)**: Use your own OpenAI API key for complete control
- **Document Upload**: Support for PDF, DOCX, CSV, and Markdown files
- **RAG-Powered Chat**: Intelligent conversations using your uploaded documents
- **Widget Integration**: Easy-to-embed chat widget for any website
- **User Authentication**: Secure authentication with NextAuth.js and Supabase

### Pages & Components

#### Public Pages
- **Landing Page** (`/`): Modern hero section, features grid, pricing tiers, and CTA banner
- **Login** (`/login`): Secure authentication with email/password
- **Signup** (`/signup`): User registration with email verification support

#### Protected Pages (Require Authentication)
- **Dashboard** (`/dashboard`): 
  - Bot management interface
  - Usage statistics widget
  - Create Bot wizard (3-step process)
  - Bot settings modal with widget preview
- **Upload** (`/upload`): Document upload and management
- **Widget** (`/widget`): Widget configuration and setup
- **Chat** (`/chat/[botId]`): Hosted chat interface with message history

### Design System

#### Color Palette
- **Primary**: Purple (#6B46C1) - Main buttons and headings
- **Secondary**: Gray 50/100/200 - Backgrounds and borders
- **Text**: Slate 900 (headings), Slate 700 (body)
- **Accent**: Emerald 500 (#10B981) - CTA buttons

#### Components
- **Button**: Variants (primary, secondary, ghost, accent, danger) with size options
- **Card**: Consistent padding, rounded corners, shadows
- **Input**: Full-width with focus states
- **Modal**: Responsive with smooth animations
- **Toast**: Fixed bottom-right notifications

#### Layout
- **Navbar**: Dynamic navigation based on authentication state
  - Logged out: Product, Features, Pricing, Documentation + Login/Signup
  - Logged in: Dashboard, Upload, Widget + Username/Logout
- **Footer**: Links and copyright with conditional "Create Account" button

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3
- **Authentication**: NextAuth.js v4 with Supabase
- **Database**: PostgreSQL (Supabase) with Prisma ORM
- **API**: tRPC for type-safe API calls
- **RAG**: LangChain + OpenAI + pgvector
- **UI Components**: Custom components with Tailwind CSS

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- PostgreSQL database with pgvector extension

### Setup Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd amana-chat-rag-pro
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env` file in the root directory:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database
DATABASE_URL=your_postgresql_connection_string

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# OpenAI (BYOK)
OPENAI_API_KEY=your_openai_api_key

# Encryption
ENCRYPTION_KEY=your_encryption_key
```

4. **Set up the database**
```bash
# Enable pgvector extension in Supabase SQL editor:
# CREATE EXTENSION IF NOT EXISTS vector;

# Push Prisma schema to database
npm run db:push
```

5. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 📁 Project Structure

```
amana-chat-rag-pro/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── page.tsx           # Landing page
│   │   ├── login/             # Login page
│   │   ├── signup/            # Signup page
│   │   ├── dashboard/         # Dashboard (protected)
│   │   ├── upload/            # Upload page (protected)
│   │   ├── widget/            # Widget page (protected)
│   │   ├── chat/[botId]/      # Chat page (protected)
│   │   ├── layout.tsx         # Root layout with Navbar/Footer
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── layout/            # Navbar, Footer
│   │   ├── ui/                # Reusable UI components
│   │   ├── dashboard/         # Dashboard-specific components
│   │   └── upload/            # Upload components
│   ├── server/                # Server-side code
│   │   ├── api/               # tRPC routers
│   │   └── auth.ts            # NextAuth configuration
│   └── lib/                   # Utilities and configs
│       ├── db.ts              # Prisma client
│       ├── supabase.ts        # Supabase clients
│       └── utils.ts           # Helper functions
├── public/                    # Static files
└── tailwind.config.ts         # Tailwind configuration
```

## 🔐 Authentication Flow

### Login Process
1. User enters email/password on `/login`
2. Credentials verified via Supabase Auth
3. NextAuth session created
4. User redirected to `/dashboard`

### Logout Process
1. User clicks "Logout" in Navbar
2. Confirmation modal appears
3. NextAuth session cleared
4. User redirected to `/` (home page)

### Protected Routes
- `/dashboard` - Requires authentication
- `/upload` - Requires authentication
- `/widget` - Requires authentication
- `/chat/[botId]` - Requires authentication

Unauthenticated users are automatically redirected to `/login`.

## 🎨 Design Tokens

### Spacing & Layout
- Container: `max-w-[1200px] px-6 md:px-8`
- Border radius: `rounded-2xl` (main), `rounded-lg` (inputs)
- Shadows: `shadow-lg` (cards), `shadow-sm` (buttons)

### Typography
- Font: Inter (Google Fonts)
- Headings: `text-slate-900`
- Body: `text-slate-700`

### Transitions
- Default: `transition-colors duration-300`
- Hover effects on all interactive elements

## 🚦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push Prisma schema to database
- `npm run db:studio` - Open Prisma Studio
- `npm run db:generate` - Generate Prisma client

## 🧪 Testing Instructions

To test the widget functionality locally:

1. **Start the main application server**:
```bash
npm run dev -- -p 3000
```

2. **Start the test site server**:
```bash
cd test-chat-site && npx -y serve . -p 3800
```

3. **Access the test site**:
Open [http://localhost:3800](http://localhost:3800) in your browser and click the chat widget button to test the functionality.

## 🔄 Routing & Navigation

### Public Routes
- `/` - Landing page
- `/login` - Login page
- `/signup` - Signup page

### Protected Routes (Require Authentication)
- `/dashboard` - Main dashboard
- `/upload` - Document upload
- `/widget` - Widget configuration
- `/chat/[botId]` - Chat interface

### Navigation
- All links use Next.js `Link` component for client-side navigation
- Programmatic navigation uses `useRouter` from `next/navigation`
- Protected routes automatically redirect to `/login` if unauthenticated

## 🚀 Deployment

### Docker Deployment

This application can be deployed using Docker for easy containerization and deployment.

#### Building and Running with Docker

1. Build the Docker image:
```bash
npm run docker:build
```

2. Run the Docker container:
```bash
npm run docker:run
```

3. Access the application at `http://localhost:3000`

#### Development with Docker Compose

For local development with a PostgreSQL database:

```bash
npm run docker:dev
```

This will start both the application and a PostgreSQL database container.

### Environment Variables

For deployment, you'll need to set the following environment variables:

- `DATABASE_URL` - Connection string for your PostgreSQL database
- `DIRECT_URL` - Direct connection string for database migrations
- `NEXTAUTH_URL` - The URL of your deployed application (e.g., https://your-app.onrender.com)
- `NEXTAUTH_SECRET` - A random string used to hash tokens, sign/encrypt cookies and generate cryptographic keys
- `ENCRYPTION_KEY` - A 32+ character random string for encrypting API keys
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `OPENAI_API_KEY` - Your OpenAI API key (optional)

### Deploying to Render

1. Fork this repository to your GitHub account
2. Create a new Web Service on Render
3. Connect your forked repository
4. Set the build command to `npm install && npm run build`
5. Set the start command to `npm start`
6. Add the required environment variables in the Render dashboard
7. Deploy!

The `render.yaml` file in this repository provides a basic configuration for Render deployment.

## 🎯 Key Features Implemented

### 1. Create Bot Wizard
- **Step 1**: Bot name and welcome message
- **Step 2**: API key input (BYOK) with test functionality
- **Step 3**: Document upload with drag & drop
- **Step 4**: Ingestion status (Queued → Running → Done)

### 2. Bot Settings Modal
- Widget preview with theme controls
- Primary color picker
- Corner radius options
- Integration code snippet generator
- Copy to clipboard functionality

### 3. Chat Interface
- Message list with user/assistant distinction
- Input box with send button
- Quick replies (pill buttons)
- Attachment button (UI ready, functionality pending)
- Loading states and animations

### 4. Responsive Design
- Mobile-first approach
- Breakpoints: `sm`, `md`, `lg`
- Responsive navigation (hamburger menu on mobile)
- Adaptive layouts for all pages

## 🔒 Security Features

- API keys encrypted at rest
- Secure session management with NextAuth
- Protected API routes
- Input validation and sanitization
- CSRF protection via NextAuth

## 📝 Environment Variables

See `.env.example` for all required environment variables. Key variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Secret for NextAuth session encryption
- `OPENAI_API_KEY` - OpenAI API key (BYOK)
- `ENCRYPTION_KEY` - Key for encrypting stored API keys

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Supabase for the backend infrastructure
- Tailwind CSS for the utility-first CSS framework
- OpenAI for the GPT models

---

Built with ❤️ using Next.js 14, TypeScript, and Tailwind CSS
