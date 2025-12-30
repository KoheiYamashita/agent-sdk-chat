[日本語](./README.md) | [中文](./README_ZH.md)

# Agent SDK Chat

> **Note**: This project is intended for personal use. Commercial or multi-user use is not supported.

A browser-based chat application using Claude Agent SDK. Interact with Claude Code through a ChatGPT-like interface.

## Demo

https://github.com/user-attachments/assets/3f392e56-efb6-4d51-85d3-e021e2a93ea6

## Features

- **Real-time Chat**: Streaming responses via SSE (Server-Sent Events)
- **Thinking Process Display**: View Claude's reasoning process in real-time
- **Tool Execution Approval**: Workflow requiring user approval before tool execution
- **Session Management**: Save and continue conversation history
- **Auto Title Generation**: Automatically generate titles based on conversation content
- **Custom Models**: Create models with customized system prompts and icons
- **Skills**: Manage and execute Claude Agent SDK skills
- **File Management**: File operations within the workspace
- **Terminal Access**: Operate terminal directly from browser (xterm.js + WebSocket)
- **Appearance Customization**: Favicon settings, UI themes

## Setup

### 1. Environment Variables

Create a `.env` file in the project root with the following content:

```bash
DATABASE_URL="file:./prisma/dev.db"
ANTHROPIC_API_KEY=your-api-key
```

### 2. Installation and Startup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Database migration
npm run db:migrate

# Production build
npm run build

# Start server
npm run start
# Or start in background
npm run start:bg
# Specify host
npm run start -- --host 0.0.0.0
```

### 3. Access

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

```bash
# Start development server (hot reload)
npm run dev

# Run ESLint
npm run lint

# TypeScript type check
npm run typecheck

# Start Prisma Studio
npm run db:studio
```
