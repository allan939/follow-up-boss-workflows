# Follow Up Boss Automation Workflow Builder

A full-featured web app for real estate teams to manage Follow Up Boss automation sequences, script libraries, and daily activity reporting.

## Features

- **10 trigger-based automation sequences** — Cold Lead, Handraiser, Past Client, Referral, Speed-to-Lead, Listing Engagement, Revival, Open House, Price Drop, Anniversary
- **Script Library** — Pre-written SMS, email, and voicemail scripts with merge fields like `[Name]`, `[Your Name]`, `[Area]`
- **Daily Activity Dashboard** — Dials, talk time, contact rate, appointments, agent leaderboard, 7-day trend charts

## Tech Stack

- **Frontend:** React + Tailwind CSS + shadcn/ui + Recharts
- **Backend:** Express + SQLite (via Drizzle ORM)
- **Build:** Vite

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5000](http://localhost:5000)

## Build for Production

```bash
npm run build
NODE_ENV=production node dist/index.cjs
```
