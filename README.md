# Rainbow Three Jay's

A web-based 5v5 First Person Shooter game using ThreeJS, incorporating lean mechanics inspired by "Rainbow Six Siege."

## Features

- First-person perspective with mouse and keyboard controls
- Lean mechanics for peeking around corners
- Basic shooting mechanics with hit detection
- Multiplayer support for up to 10 players (5 per team)
- Simple 3D map with obstacles and cover
- Team-based gameplay
- UI elements including health bars, team indicators, and scoreboard

## Development Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the development server

1. Start the Vite development server:

   ```bash
   npm run dev
   ```

2. In a separate terminal, start the game server:

   ```bash
   npm run dev:server
   ```

3. Open your browser and navigate to `http://localhost:5173`

### Building for production

1. Build the client:

   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Project Structure

- `/public` - Static assets
- `/src` - Source code
  - `/components` - Game components
  - `/utils` - Utility functions
- `server.js` - Express server with Socket.IO
