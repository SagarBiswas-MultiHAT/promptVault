<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Prompt Vault

A secure, feature-rich prompt management application built with React and TypeScript. Store, organize, and manage your AI prompts with ease.

## Features

- **Secure Storage**: Protect your prompts with PIN-based encryption
- **Prompt Organization**: Organize prompts by categories
- **Search & Filter**: Quickly find prompts with powerful search
- **Variable Management**: Create and manage dynamic prompt variables
- **Import/Export**: Backup and restore your prompt library
- **Dark Mode**: Easy on the eyes with theme switching
- **Statistics Dashboard**: Track your prompt collection

## Quick Start

### Prerequisites

- Node.js (v16 or higher)

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the development server:

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview the production build
- `npm run lint` - Run TypeScript type checking
- `npm run clean` - Clean build artifacts

## Project Structure

```
src/
├── components/     # React components
├── utils/         # Utility functions (encryption, etc.)
├── types.ts       # TypeScript type definitions
├── constants.ts   # App constants
└── App.tsx        # Main application component
```

## Storage

All your prompts are stored locally in your browser's localStorage. Your data never leaves your device.

## License

Apache-2.0
