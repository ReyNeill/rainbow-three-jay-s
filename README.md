# Rainbow Three Jay's

A web-based 5v5 First Person Shooter game using ThreeJS, incorporating lean mechanics inspired by "Rainbow Six Siege."

## Features

- First-person perspective with mouse and keyboard controls
- Lean mechanics for peeking around corners (Q/E keys)
- Basic shooting mechanics with hit detection (left mouse button)
- Multiplayer support for up to 10 players (5 per team)
- Simple 3D map with obstacles and cover
- Team-based gameplay
- UI elements including crosshair, health indicators, and hit feedback

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
3. Add sound files:
   - Place a "gunshot.mp3" file in the public/sounds directory

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

## Controls

- **WASD**: Move
- **Mouse**: Look around
- **Q/E**: Lean left/right
- **Space**: Jump
- **Left Mouse Button**: Shoot

## Project Structure

- `/public` - Static assets
  - `/sounds` - Sound effects
- `/src` - Source code
  - `/components` - Game components
  - `/utils` - Utility functions
- `server.js` - Express server with Socket.IO
