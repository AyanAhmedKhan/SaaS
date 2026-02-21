# EduYantra — School Management System

A modern, full-stack school management platform built with React + Express.js.

## Tech Stack

**Frontend**: React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS, React Query  
**Backend**: Express.js, SQLite (better-sqlite3), JWT Auth, Zod validation  

## Quick Start

```sh
# 1. Install frontend dependencies
npm install

# 2. Install backend dependencies
cd server && npm install

# 3. Seed the database
npm run seed

# 4. Start the backend (port 3001)
npm start

# 5. In another terminal, start the frontend (port 8080)
cd .. && npm run dev
```

## Default Login Credentials

| Role    | Email              | Password |
|---------|--------------------|----------|
| Admin   | admin@school.com   | demo123  |
| Teacher | sharma@school.com  | demo123  |
| Student | arjun@school.com   | demo123  |
| Parent  | rajesh@school.com  | demo123  |

## Features

- **Role-based dashboards** — Admin, Teacher, Student, Parent
- **Student management** — Profiles, attendance, academic performance
- **Teacher management** — Subject assignments, class schedules
- **Attendance tracking** — Daily mark, reports, trends
- **Timetable** — Class-wise schedule management
- **Syllabus** — Topic tracking with completion status
- **Reports** — Exam results, performance trends, charts
- **Notices** — Priority-based announcement system
- **AI Insights** — Dashboard analytics cards

## Project Structure

```
├── server/              # Express.js backend
│   ├── src/
│   │   ├── db/          # SQLite schema, seed, connection
│   │   ├── middleware/  # Auth, error handling, logging
│   │   └── routes/      # API route handlers
│   └── package.json
├── src/                 # React frontend
│   ├── components/      # UI components
│   ├── contexts/        # Auth context
│   ├── lib/             # API client, utilities
│   ├── pages/           # Route pages
│   └── types/           # TypeScript types
└── package.json
```
