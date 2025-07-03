# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Grocery Gale is a meal planning and grocery list application with an AI-powered chat interface. The app helps users plan meals based on their dietary preferences and generates grocery lists. It's built as a Lovable project using React, TypeScript, Vite, and Supabase.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Run linter
npm run lint

# Preview production build
npm run preview
```

## Architecture Overview

### Frontend Structure
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with SWC
- **Routing**: React Router v6
- **UI Components**: shadcn/ui built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **State Management**: React Query (TanStack Query) for server state
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Platform**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth with Row Level Security
- **Real-time**: Server-Sent Events for streaming chat responses
- **External Integration**: n8n webhook at `https://pskinnertech.app.n8n.cloud/webhook-test/gale`

### Database Schema
- `profiles`: User profile data (auto-created on signup)
- `dietary_preferences`: User dietary restrictions and meal preferences
- `meal_plans`: Weekly meal plans (JSONB structure)
- `chat_conversations`: Chat history with messages array (JSONB)
- `user_message_activity`: Tracks user's last message timestamp

All tables have RLS policies ensuring users can only access their own data.

### Key Application Flow
1. User signs up → profile created via trigger
2. Onboarding → dietary preferences collected
3. Chat interface → streaming AI responses via Edge Function
4. Meal plans → stored and managed in database

### Important Files and Patterns

**Component Organization**:
- Pages in `src/pages/` - main route components
- UI components in `src/components/ui/` - shadcn/ui components
- Custom hooks in `src/hooks/`
- Supabase integration in `src/integrations/supabase/`

**Type Safety**:
- Database types auto-generated in `src/integrations/supabase/types.ts`
- Component props should use TypeScript interfaces
- Form schemas defined with Zod

**Streaming Chat Implementation**:
- Edge function: `supabase/functions/streaming-chat/index.ts`
- Handles FormData with user message and profile
- Implements SSE with word-by-word streaming (25ms delay)
- 60-second timeout for responses

## Development Guidelines

### When Adding Features
1. Check existing UI components in `src/components/ui/` before creating new ones
2. Use existing patterns for Supabase queries (see `src/integrations/supabase/client.ts`)
3. Follow the established RLS pattern when adding database tables
4. Use React Query for data fetching and caching

### Code Style
- TypeScript is configured with relaxed settings (no strict mode)
- Use Tailwind classes for styling, avoid inline styles
- Follow existing component structure and naming conventions
- Path alias `@/` is configured for `src/` directory

### Environment Configuration
Supabase credentials are currently hardcoded in `src/integrations/supabase/client.ts`:
- URL: `https://rxqxvdabwsbjgrcjluhf.supabase.co`
- Anon Key: (public key in the file)

For local development, Supabase services run on:
- API: http://localhost:54321
- Database: http://localhost:54322
- Studio: http://localhost:54323

### Deployment
The project is configured for deployment on Lovable's platform. See README.md for specific deployment instructions and custom domain setup.

## Common Tasks

### Adding a New Page
1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Update navigation if needed

### Working with Database
1. Add migration in `supabase/migrations/`
2. Update types by regenerating from Supabase
3. Add RLS policies for security
4. Create corresponding React Query hooks

### Modifying Chat Behavior
1. Update Edge Function in `supabase/functions/streaming-chat/`
2. Modify webhook integration if needed
3. Update Chat.tsx component for UI changes

### Testing
Currently no test framework is configured. When adding tests:
1. Set up testing framework (Jest/Vitest recommended)
2. Add test scripts to package.json
3. Follow React Testing Library best practices