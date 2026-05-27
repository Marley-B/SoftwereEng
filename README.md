# Minimal User Authentication Template

A minimal monorepo template with user authentication and basic project structure.

## Structure

- `apps/api` - Fastify API with user registration and login
- `packages/db` - PostgreSQL database schema with Drizzle ORM
- `packages/shared` - Shared TypeScript types and Zod validation schemas

## Features

- User registration and login via JWT tokens
- Password hashing with scrypt
- PostgreSQL database integration
- TypeScript throughout
- Minimal, clean codebase for extending

## Quick Start

1. Install Bun: https://bun.sh
2. Run `bun install`
3. Set up environment variables:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   JWT_SECRET=your_secret_key
   API_HOST=0.0.0.0
   API_PORT=3000
   ```
4. Run migrations: `bun run --filter @route-helper/db migrate` (if applicable)
5. Start the API: `bun run dev`

## API Endpoints

- `POST /auth/register` - Register a new user
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "displayName": "User Name"
  }
  ```

- `POST /auth/login` - Login user
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- `GET /health` - Health check

## Testing

- `bun run test` - Run all tests
- `bun run test:api` - Run API tests
- `bun run test:shared` - Run shared package tests

## Type Checking

- `bun run typecheck` - Check types across all packages
