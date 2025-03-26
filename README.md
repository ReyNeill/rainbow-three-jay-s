# Rainbow Three Jay's

A web-based 5v5 First Person Shooter game prototype using ThreeJS, incorporating lean and aim-down-sights (ADS) mechanics inspired by tactical shooters like "Rainbow Six Siege."

## Features

- First-person perspective with mouse and keyboard controls.
- Smooth movement system: Walk (Alt), Normal, Sprint (Shift).
- Jumping (Space) and gravity.
- Leaning mechanics (Q/E) for peeking around corners (Toggle/Hold modes via 'L' key).
- Vaulting system (Space) over obstacles of appropriate height (MiniTable, Table, HalfWall).
- Aim Down Sights (ADS) mechanic (Right Mouse Button) with FOV zoom, weapon centering, reduced movement speed, and reduced weapon bob.
- Basic hitscan shooting (Left Mouse Button) with raycasting, muzzle flash, hit effects, and sound.
- Weapon bobbing animation during movement, adjusted for speed and ADS state.
- Collision detection preventing movement through walls and objects.
- Simple test map with obstacles, moving targets, and dummy players.
- UI elements: Crosshair (hidden during ADS), vault prompts, hit markers, notifications.
- Centralized configuration (`Config.js`) for easy tuning of game parameters.
- Basic multiplayer support (via Socket.IO) for player synchronization (position, rotation, lean).

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/)

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  Install dependencies:
    ```bash
    bun install
    ```
3.  Add sound files:
    - Place a `gunshot.mp3` file in the `public/sounds/` directory.

### Running the development server

1.  Start the Vite development server for the client:
    ```bash
    bun run dev
    ```
2.  In a separate terminal, start the game server:
    ```bash
    bun run dev:server
    ```
3.  Open your browser and navigate to `http://localhost:5173` (or the port specified by Vite).

### Building for production

1.  Build the client application:
    ```bash
    bun run build
    ```
2.  Start the production server (ensure a `start` script exists in `package.json` that runs `node server.js` or similar):
    ```bash
    bun run start
    ```
    _Alternatively, you can run the server directly:_
    ```bash
    bun run server.js
    ```

## Controls

- **WASD**: Move
- **Mouse**: Look around
- **Shift (Hold)**: Sprint
- **Alt (Hold)**: Walk
- **Q/E**: Lean left/right (behavior depends on lean mode)
- **L**: Toggle Lean Mode (Toggle/Hold)
- **Space**: Jump / Vault (when prompted)
- **Left Mouse Button**: Shoot
- **Right Mouse Button (Hold)**: Aim Down Sights (ADS)

## Project Structure

- `/public` - Static assets (sounds, models if any)
- `/src` - Source code
  - `/components` - Core game logic components (PlayerController, WeaponSystem, etc.)
  - `/managers` - Input, UI, Network management classes
  - `/models` - 3D object model definitions (PlayerModel, TableModel, GunModel, etc.)
  - `/utils` - Utility classes (CollisionDetection)
  - `main.js` - Main application entry point
  - `Config.js` - Centralized game configuration
- `server.js` - Node.js server using Express and Socket.IO
- `index.html` - Main HTML file
- `vite.config.js` - Vite build configuration
- `package.json` - Project dependencies and scripts
- `README.md` - This file
- `PLAN.md` - Development plan outline
- `status.mdc` - Detailed current project status (internal)
