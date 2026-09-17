# ConnectU 🚀
### *A Modern, High-Performance Bilingual Social Networking Platform*

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15.3.8-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-blue?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Serverless-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_%26_Storage-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Google Genkit AI](https://img.shields.io/badge/AI-Google_Genkit_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://firebase.google.com/docs/genkit)
[![SonarCloud](https://sonarcloud.io/api/project_badges/measure?project=joysriramsarkar_connectu&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=joysriramsarkar_connectu)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>ConnectU</b> is a full-featured, responsive, bilingual social network tailored for seamless global and Bengali-speaking communities. Built with cutting-edge web technologies, glassmorphic UI aesthetics, instant real-time messaging, and Google Genkit Gemini AI.
</p>

[✨ Live Features](#-features) •
[🏗️ Architecture](#️-architecture--tech-stack) •
[🚀 Quick Start](#-quick-start) •
[🔐 Environment Variables](#-environment-variables) •
[📁 Project Structure](#-project-structure) •
[🛡️ Code Quality & CI/CD](#-code-quality--cicd)

---

</div>

## ✨ Features

- **🌐 Native Bilingual Experience (বাংলা ও English)**
  - Full interface localization with instant language switching between Bengali and English.
  - Specially formatted typography using Google fonts *Hind Siliguri* & *Plus Jakarta Sans*.

- **📰 Interactive Social Feed**
  - Rich multimedia posts (text, photos, media uploads via Firebase Cloud Storage).
  - Engaging social feedback loops: likes, threaded comments, bookmarking, and post sharing.
  - Personalized content feed with user suggestions and discovery.

- **💬 Instant Direct Messaging (Chat)**
  - Zero-latency conversational interface with deterministic conversation ID indexing.
  - Unread message counters, real-time sync, and blocking capabilities.

- **🤖 Google Genkit AI Integration**
  - Intelligent, context-aware hashtag generation powered by Google Gemini 2.5 Flash.
  - Automated content refinement and social trend discovery flows.

- **👤 Complete Profile & Social Graph**
  - Customizable profile info: avatars, cover photos, bio, and unique `@handle`.
  - Follow/Unfollow social graph with follower & following counts.
  - Tabbed user history (User Posts, Media, Likes, Bookmarks).

- **🔔 Real-time Notifications & Activity Center**
  - Instant alerts for likes, comments, follows, and system announcements.
  - Read/unread status indicators and quick-action navigation.

- **🛡️ Community Moderation & Safety**
  - Built-in report handling for inappropriate posts and abusive behavior.
  - Admin review dashboard for safety compliance and user blocking.

- **🎨 Modern Glassmorphic Design System**
  - Responsive layout (Mobile, Tablet, Desktop) built with Radix UI primitives.
  - Dark mode and light mode support with smooth CSS transitions and micro-interactions.

---

## 🏗️ Architecture & Tech Stack

```mermaid
graph TD
    A[Next.js 15 Client / React 18] -->|HTTPS / App Router| B[Next.js Server API Routes & Server Actions]
    B -->|Connection Pool| C[(Neon Serverless PostgreSQL)]
    B -->|Identity & Sessions| D[Firebase Auth / JWT Engine]
    B -->|Media Assets| E[Firebase Cloud Storage]
    B -->|Genkit AI Flows| F[Google Gemini 2.5 Flash]
    G[GitHub Actions] -->|Automated Checks| H[CI & SonarCloud Quality Gate]
```

### Core Technologies

| Domain | Technology | Description |
|---|---|---|
| **Framework** | [Next.js 15 (App Router)](https://nextjs.org/) | Hybrid Server Components, dynamic API routes, and optimized streaming |
| **UI & Styling** | [React 18](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/) | Accessible component primitives with customized glassmorphic design |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Strict type checking for end-to-end safety |
| **Database** | [Neon PostgreSQL](https://neon.tech/) (`pg`) | Serverless relational database with ACID compliance & connection pooling |
| **Auth & Media** | [Firebase](https://firebase.google.com/) (`v11`), [Jose](https://github.com/panva/jose) | Authentication, Cloud Storage, and secure HS256 JWT tokens |
| **Artificial Intelligence**| [Google Genkit](https://firebase.google.com/docs/genkit) (`@genkit-ai/googleai`) | Agentic flows with Gemini 2.5 Flash for hashtag & content insights |
| **Icons & Visuals** | [Lucide React](https://lucide.dev/) | Clean, consistent icons |
| **Code Analysis** | [SonarCloud](https://sonarcloud.io/), [ESLint 9](https://eslint.org/), [CodeQL](https://codeql.github.com/) | Automated static analysis, vulnerability scans, and code health metrics |

---

## 🚀 Quick Start

### Prerequisites

Ensure your development environment meets the following requirements:
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Package Manager**: `npm` (v10+)
- **PostgreSQL Database**: Neon serverless account or local PostgreSQL instance
- **Firebase Project**: Firebase Auth & Firebase Storage enabled
- **Gemini API Key**: Google AI Studio API key (for Genkit AI features)

### 1. Clone the Repository

```bash
git clone https://github.com/joysriramsarkar/connectu.git
cd connectu
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Copy the sample environment file and populate the credentials:

```bash
cp .env.example .env.local
```

### 4. Setup Database Schema

Run the initial schema scripts to create tables, indexes, and relations:

```bash
# Connect to your PostgreSQL database and execute the schema files in db/
psql $DATABASE_URL -f db/schema.sql
```

### 5. Launch the Development Server

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) in your browser to experience ConnectU.

---

## 🔐 Environment Variables

Key environment variables configured in `.env.local`:

| Variable | Required | Description |
|---|:---:|---|
| `DATABASE_URL` | **Yes** | PostgreSQL / Neon connection string (e.g., `postgresql://user:pass@host/db?sslmode=require`) |
| `JWT_SECRET` | **Yes** | Cryptographic secret for signing application session tokens |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | **Yes** | Firebase Client SDK API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | **Yes** | Firebase authentication domain (e.g., `app.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | **Yes** | Firebase project identifier |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | **Yes** | Firebase Cloud Storage bucket for media uploads |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| **Yes** | Firebase Cloud Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | **Yes** | Firebase web app application ID |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Optional | Server-side Firebase Admin SDK credentials JSON string |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for Genkit AI hashtag workflows |

---

## 📁 Project Structure

```text
connectu/
├── .github/
│   ├── dependabot.yml              # Dependabot security & update configuration
│   └── workflows/
│       ├── ci.yml                  # Linting, typecheck & build pipeline
│       ├── sonarcloud.yml          # SonarCloud Quality Gate analysis
│       └── security.yml            # CodeQL SAST and npm vulnerability scan
├── db/                             # SQL migrations, schema & seeds
├── public/                         # Static icons, logos, and images
├── src/
│   ├── ai/                         # Google Genkit setup & AI flows
│   │   ├── flows/                  # Hashtag and content generation flows
│   │   └── genkit.ts               # Genkit initialization with Gemini 2.5 Flash
│   ├── app/                        # Next.js 15 App Router routes & layouts
│   │   ├── api/                    # REST API endpoints (v1, auth, posts, messages)
│   │   ├── bookmarks/              # Saved posts page
│   │   ├── login/ & signup/        # Authentication pages
│   │   ├── messages/               # Instant chat and conversations UI
│   │   ├── moderation/             # Admin moderation dashboard
│   │   ├── notifications/          # Activity notifications
│   │   ├── post/[id]/              # Single post & comments view
│   │   ├── profile/                # User profile & settings
│   │   ├── search/                 # User & post discovery
│   │   ├── globals.css             # Design tokens & glassmorphic styling
│   │   └── layout.tsx              # Root app layout with Google Fonts
│   ├── components/                 # Reusable UI components & Radix wrappers
│   │   ├── app-shell.tsx           # Responsive layout shell & navigation
│   │   ├── create-post.tsx         # Post creation with AI suggestions
│   │   ├── post-card.tsx           # Feed post card component
│   │   └── ui/                     # Radix UI primitive components
│   ├── contexts/                   # React Contexts (Auth, i18n, Theme)
│   ├── lib/                        # Utility libraries (Neon DB, JWT, Firebase, etc.)
│   └── locales/                    # Bilingual translations (en.json, bn.json)
├── sonar-project.properties        # SonarCloud configuration
├── tailwind.config.ts              # Tailwind CSS theme configuration
└── tsconfig.json                   # Strict TypeScript compiler options
```

---

## 🛡️ Code Quality & CI/CD

Quality, security, and performance are automated using GitHub Actions and SonarCloud:

### Local Validation Scripts

```bash
# 1. Check for ESLint warnings or errors
npm run lint

# 2. Verify strict TypeScript types across the codebase
npm run typecheck

# 3. Compile optimized production build
npm run build
```

### Automated GitHub Workflows

1. **Continuous Integration (`ci.yml`)**:
   - Runs on every `push` and `pull_request` targeting `main`.
   - Executes ESLint validation, strict TypeScript checking, and production build verification.
2. **SonarCloud Code Quality Gate (`sonarcloud.yml`)**:
   - Performs deep static analysis for bugs, code smells, security hotspots, and reliability issues.
   - Synchronizes directly with the [SonarCloud Dashboard](https://sonarcloud.io/summary/new_code?id=joysriramsarkar_connectu).
3. **CodeQL Security Analysis (`security.yml`)**:
   - GitHub Advanced Security static analysis (SAST) for vulnerability prevention.
   - Scheduled weekly audits and critical dependency vulnerability checks.
4. **Dependabot Updates (`dependabot.yml`)**:
   - Automated weekly PRs for keeping npm dependencies and GitHub Actions up to date.

---

## 🤝 Contributing

Contributions, bug reports, and feature suggestions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).

---

<div align="center">
  Developed with ❤️ by <a href="https://github.com/joysriramsarkar">Joysriram Sarkar</a> and contributors.
</div>
