# PPM - AI Project Manager

PPM is a professional, direct, and supportive AI project management assistant built for freelance software developers. 

## Features
- **Project Planning**: Get structured project plans with phases, tasks, milestones, and effort estimates.
- **Task Prioritization**: Reorder daily list by deadline, dependency, and client impact.
- **Progress Tracking**: Track projects visually with progression status and ASCII progress bars.
- **Client Communication**: Draft professional emails, Slack messages, and meeting agendas.
- **Scope & Risk Radar**: Instantly detect scope creep and get ready-to-use scripts to push back professionally.
- **Financial & Admin**: Generate invoice line-item descriptions and track retainer hours.

## Prerequisites

- Node.js (v18 or newer recommended)
- A Gemini API Key from Google AI Studio

## Setup

1. Create a `.env` file in the root directory and add your API credentials based on the `.env.example` file:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   ```

2. Install the necessary dependencies:
   ```bash
   npm install
   ```

## Development

Run the following command to start the development environment:
```bash
npm run dev
```

## Production Build

To build the project for production and run the compiled server:
```bash
npm run build
npm run start
```

## Tech Stack
- Frontend: React, TailwindCSS, Lucide Icons, Vite
- Backend: Node.js, Express
- AI: Google Gen AI SDK
