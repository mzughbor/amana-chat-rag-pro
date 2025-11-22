# AmanaRAG MVP

A BYOK (Bring Your Own Key) RAG-based chatbot platform that enables small businesses to embed an AI assistant on their website.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase PostgreSQL with pgvector
- **Auth**: NextAuth.js with Supabase
- **API**: tRPC
- **Styling**: Tailwind CSS
- **RAG**: LangChain + OpenAI + pgvector

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- PostgreSQL database with pgvector extension

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Fill in your environment variables
```

4. Set up the database:
```bash
# Enable pgvector extension in Supabase SQL editor:
# CREATE EXTENSION IF NOT EXISTS vector;

# Push Prisma schema to database
npm run db:push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
amana-rag/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/              # Next.js app router pages
│   ├── server/           # Server-side code (tRPC, services)
│   ├── components/       # React components
│   └── lib/              # Utilities and configs
└── public/               # Static files
```

## Environment Variables

See `.env.example` for required environment variables.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:studio` - Open Prisma Studio
- `npm run db:push` - Push schema changes to database

## License

MIT

