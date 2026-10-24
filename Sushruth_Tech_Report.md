# Sushruth — Technology Report

## Overview

Sushruth is a full-stack AI-powered healthcare assistant web application built for Indian users. It is designed to help people triage symptoms, simplify medical reports, book doctor appointments, manage medications, and track their health — all in one platform.

---

## Languages

The entire application is written in **TypeScript**, a strongly-typed superset of JavaScript. Using one language across both frontend and backend ensures shared types, fewer bugs, and a consistent development experience throughout the codebase.

---

## Frontend

The user interface is built with **React 19**, the latest version of the popular component-based UI library. **Vite** serves as the build tool, offering fast development and optimised production builds. Styling is handled by **Tailwind CSS v4**, a utility-first CSS framework, while **shadcn/ui** provides a library of accessible, pre-built UI components such as buttons, cards, dialogs, and tables. User authentication on the frontend is managed by **Clerk v6**, which handles sign-in, sign-up, and session management securely.

---

## Backend

The server is built with **Express 5** running on **Node.js 24**. It exposes a REST API that the frontend communicates with. All incoming data is validated using **Zod**, a TypeScript-first schema validation library. The database is **PostgreSQL**, accessed through **Drizzle ORM**, which provides type-safe database queries and schema management.

---

## Artificial Intelligence

AI features are powered by **OpenAI's GPT-4o Mini** model, used for symptom triage and medical report simplification. **Anthropic's Claude** model is used for analysing medical report images. Both AI integrations are handled securely on the backend.

---

## API Design

The project follows a **contract-first approach** using an **OpenAPI specification** as the single source of truth. **Orval** generates typed React Query hooks and Zod schemas automatically from this spec, keeping the frontend and backend perfectly in sync.

---

## Package Management

The project uses **pnpm workspaces**, a monorepo setup that organises the frontend, backend, and shared libraries into a single repository with shared dependencies managed efficiently.
# Sushruth — Technology Report

## Overview

Sushruth is a full-stack AI-powered healthcare assistant web application built for Indian users. It is designed to help people triage symptoms, simplify medical reports, book doctor appointments, manage medications, and track their health — all in one platform.

---

## Languages

The entire application is written in **TypeScript**, a strongly-typed superset of JavaScript. Using one language across both frontend and backend ensures shared types, fewer bugs, and a consistent development experience throughout the codebase.

---

## Frontend

The user interface is built with **React 19**, the latest version of the popular component-based UI library. **Vite** serves as the build tool, offering fast development and optimised production builds. Styling is handled by **Tailwind CSS v4**, a utility-first CSS framework, while **shadcn/ui** provides a library of accessible, pre-built UI components such as buttons, cards, dialogs, and tables. User authentication on the frontend is managed by **Clerk v6**, which handles sign-in, sign-up, and session management securely.

---

## Backend

The server is built with **Express 5** running on **Node.js 24**. It exposes a REST API that the frontend communicates with. All incoming data is validated using **Zod**, a TypeScript-first schema validation library. The database is **PostgreSQL**, accessed through **Drizzle ORM**, which provides type-safe database queries and schema management.

---

## Artificial Intelligence

AI features are powered by **OpenAI's GPT-4o Mini** model, used for symptom triage and medical report simplification. **Anthropic's Claude** model is used for analysing medical report images. Both AI integrations are handled securely on the backend.

---

## API Design

The project follows a **contract-first approach** using an **OpenAPI specification** as the single source of truth. **Orval** generates typed React Query hooks and Zod schemas automatically from this spec, keeping the frontend and backend perfectly in sync.

---

## Package Management

The project uses **pnpm workspaces**, a monorepo setup that organises the frontend, backend, and shared libraries into a single repository with shared dependencies managed efficiently.
