[![codecov](https://codecov.io/gh/martinmoradi/finance-app/branch/main/graph/badge.svg)](https://codecov.io/gh/martinmoradi/finance-app)

# Personal Finance Application

A comprehensive personal finance management solution built with enterprise-grade architecture and modern web technologies.
This project demonstrates professional full-stack development capabilities with a focus on TypeScript, testing practices, and scalable architecture patterns.

## Project Overview

This application helps users manage their personal finances through:

- Transaction tracking and categorization
- Budget planning and monitoring
- Savings goals management
- Recurring bill tracking
- Comprehensive financial analytics
- Multi-language support (French/English)

## Technical Stack

### Frontend

- Next.js 15 (App Router)
- TypeScript (strict mode)
- TanStack Query for server state
- Zustand for client state
- Tailwind CSS with shadcn/ui
- Internationalization with next-intl
- Testing: Vitest, Playwright, React Testing Library

### Backend

- NestJS with TypeScript
- PostgreSQL with Drizzle ORM
- Custom JWT authentication
- REST API with OpenAPI documentation
- Testing: Jest, SuperTest

### DevOps

- Turborepo monorepo
- Docker
- GitHub Actions CI/CD
- Deployed on Vercel (Frontend), Render (Backend), and Neon (Database)

## Getting Started

### Prerequisites

- Node.js 22+
- Docker and Docker Compose
- pnpm (recommended)

### Development Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/personal-finance-app.git
cd personal-finance-app
```

2. Install dependencies:

```bash
pnpm install
```

3. Start the development environment:

```bash
docker:dev:build
```

4. Access the application:

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- API Documentation: http://localhost:4000/api

## Project Structure

```
├── apps/
│   ├── web/                 # Next.js frontend
│   └── api/                 # NestJS backend
├── packages/
│   ├── shared/             # Shared types and utilities
│   ├── database/           # Database schemas and migrations
└── package.json
```

## Key Features

### Secure Authentication

- Framework-agnostic Better-Auth implementation
- Cookie-based secure session management
- Built-in rate limiting and security features
- Direct database integration through Drizzle adapter

### Transaction Management

- CRUD operations with real-time updates
- Advanced filtering and search
- Category-based organization
- CSV export functionality

### Budget Tracking

- Category-based budgets
- Progress monitoring
- Automated calculations
- Visual representations

### Savings Goals

- Goal creation and tracking
- Progress visualization
- Milestone tracking
- Projection calculations

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch
- Feature branches: `feature/*`
- Bug fixes: `fix/*`
- Documentation: `docs/*`

### Testing Requirements

- Unit tests for business logic
- Component tests for UI
- E2E tests for critical paths
- API endpoint testing

### PR Guidelines

All PRs must:

- Pass automated tests
- Include relevant tests
- Follow conventional commits
- Have proper documentation
- Pass accessibility checks

## License

MIT License - see LICENSE.md

## Contact

Martin Moradi - [moradi.martin@gmail.com]

Project Link: WIP

## Acknowledgments

- Frontend Mentor for the initial design inspiration
- shadcn/ui for the component foundation

---

_This project was developed as a portfolio piece demonstrating full-stack development capabilities, with a focus on enterprise-grade patterns and practices._
