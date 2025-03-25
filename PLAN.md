### Step-by-Step Development Plan (Revised)

This revised plan breaks development into phases, incorporating refinement, testing, refactoring, and key architectural considerations earlier in the process.

#### Phase 1: Set Up the Development Environment

- **Objective**: Establish the project foundation.
- **Steps**:
  - Install Node.js and npm/yarn.
  - Set up a basic ThreeJS project with a simple scene.
  - Integrate Socket.IO and test basic client-server communication.
- **Testing**: Verify basic rendering and network connectivity.

#### Phase 2: Implement Basic Player Movement & Core Architecture

- **Objective**: Enable player control and establish core client systems.
- **Steps**:
  - Create a first-person camera controller using ThreeJS (`PlayerController`).
  - Implement keyboard controls (WASD) and mouse look.
  - Implement basic collision detection (`CollisionDetection`).
  - **Centralize Configuration**: Create a `Config` object/file for parameters like move speed, gravity, player dimensions.
  - **Implement Input Manager**: Create `InputManager` to handle raw input events and map them to actions. Refactor `PlayerController` to use it.
  - **Implement UI Manager**: Create `UIManager` to handle basic HUD elements (crosshair, instructions). Refactor components to use it.
- **Testing**: Test movement, looking, basic collision against simple shapes, input action mapping, UI visibility.

#### Phase 3: Add Lean & Vault Mechanics

- **Objective**: Introduce signature movement features.
- **Steps**:
  - Modify `PlayerController` to support leaning left/right (Q/E keys) using positional offset and camera roll, driven by `InputManager`.
  - Implement `VaultingSystem` to detect vaultable objects (using `userData`) and manage vault animation.
  - Integrate vaulting trigger (Space key) via `InputManager` into `PlayerController`.
  - Create basic vaultable object models (`TableModel`, `MiniTableModel`, etc.) and add them to the scene.
  - Ensure `UIManager` displays vault prompts correctly via `VaultingSystem`.
- **Testing**: Test lean consistency from different angles, test vault detection and execution on various object heights.

#### Phase 4: Implement Basic Shooting Mechanics

- **Objective**: Add core combat functionality.
- **Steps**:
  - Implement `WeaponSystem` using raycasting from the camera center.
  - Use hitscan approach.
  - Add basic visual/audio feedback (muzzle flash, hit effects, sound) via `WeaponSystem` and `UIManager`.
  - Integrate shooting trigger (Left Click) via `InputManager` into `WeaponSystem`.
  - Implement basic `PlayerModel` (capsule/sphere) and `DummyModel` for target practice.
- **Testing**: Test shooting accuracy, hit detection on static/dummy targets, visual/audio feedback.

#### Phase 5: Refine Core Mechanics & Initial Networking

- **Objective**: Solidify single-player mechanics and introduce basic multiplayer synchronization.
- **Steps**:
  - **Refine Collision/Movement**: Improve collision response (e.g., sliding), fine-tune movement parameters using `Config`.
  - **Refine Lean/Vault**: Ensure smooth transitions and robust detection.
  - **Refine Shooting**: Implement basic ammo count (UI via `UIManager`), simple reload mechanism (input via `InputManager`).
  - **Basic Networking**:
    - Set up server (`server.js`) to manage player connections and basic state (position, rotation, lean, health, team).
    - Synchronize player state across clients (`OtherPlayers` component using `PlayerModel`).
    - Handle basic shooting events server-side (damage calculation, health updates, friendly fire prevention).
    - Implement basic hit confirmation/feedback via network events and `UIManager`.
- **Testing**: Test refined movement/collision, lean/vault robustness, basic shooting loop (shoot, reload), player synchronization accuracy, basic hit registration over network.

#### Phase 6: Code Review, Refactoring & State Management

- **Objective**: Improve code quality and prepare for increased complexity.
- **Steps**:
  - **Review & Refactor**: Analyze existing code (`PlayerController`, `WeaponSystem`, `VaultingSystem`, Managers, Models) for clarity, efficiency, and adherence to single responsibility principle. Apply necessary refactoring.
  - **Implement Client-Side State Management**: Introduce a basic `GameStateManager` or similar structure to hold references/data for local player, other players, map objects, etc., reducing direct dependencies between systems.
  - **Implement Network Manager**: Create `NetworkManager` to encapsulate Socket.IO logic (sending updates, receiving/dispatching events). Refactor `main.js` and other components to use it.
- **Testing**: Verify existing functionality remains intact after refactoring, test state access via the new manager.

#### Phase 7: Advanced Networking & Map Design

- **Objective**: Improve network feel and create a playable environment.
- **Steps**:
  - **Refine Networking**: Implement basic client-side prediction and server reconciliation for player movement to mitigate latency effects. Implement basic interpolation for remote players. Add server-side hit validation.
  - **Design Simple Map**: Build a basic 3D map layout in `GameMap` designed for tactical gameplay (cover, sightlines). Optimize geometry and textures.
- **Testing**: Test smoothness of local and remote player movement under simulated latency, test map layout for navigation and cover effectiveness, verify server-side hit validation.

#### Phase 8: Implement Team Mechanics & Core UI

- **Objective**: Introduce team play and essential gameplay UI.
- **Steps**:
  - **Team Logic**: Implement server-side logic for team assignment/balancing.
  - **Core Gameplay UI**:
    - Display local player health (via `UIManager`).
    - Display current ammo/total ammo (via `UIManager`).
    - Add team indicators for players (e.g., color coding in `PlayerModel`, potentially name tags via `UIManager`).
  - **Basic Game Mode**: Implement server-side logic for a simple game mode (e.g., Team Deathmatch with kill tracking).
- **Testing**: Test team assignment, friendly fire prevention, UI updates for health/ammo, basic game mode logic (kill counting).

#### Phase 9: Add Animations & Polish Core Loop

- **Objective**: Improve visual feedback and game feel.
- **Steps**:
  - **Basic Animations**:
    - Add simple weapon animations (firing, reloading).
    - Add basic player model animations (idle, walk - if feasible).
  - **Sound Effects**: Add more sounds (footsteps, reload, hit impacts, environmental sounds).
  - **Visual Effects**: Enhance existing effects (muzzle flash, impacts) and add new ones (e.g., bullet tracers if desired).
  - **UI Polish**: Refine existing UI elements (crosshair style, prompts). Add a basic scoreboard (via `UIManager`).
- **Testing**: Test animation playback, sound integration, visual effect performance, scoreboard updates.

#### Phase 10: Extended Testing & Optimization

- **Objective**: Ensure stability, performance, and balanced gameplay.
- **Steps**:
  - **Multiplayer Testing**: Test with multiple players to identify synchronization issues, performance bottlenecks, and gameplay bugs.
  - **Performance Optimization**: Profile and optimize rendering (draw calls, shaders), physics/collision checks, and network traffic.
  - **Gameplay Balancing**: Adjust parameters (weapon damage, player health, movement speed, lean/vault timings) based on playtesting feedback using the centralized `Config`.
  - **Bug Fixing**: Address issues identified during testing.
- **Testing**: Conduct focused playtests, performance benchmarks, network stress tests.

#### Phase 11: Final Polish & Potential Features

- **Objective**: Refine the experience and consider minor additions.
- **Steps**:
  - Add a basic game menu (start, options, quit).
  - Further refine sound design and visual effects.
  - Implement any remaining small features or quality-of-life improvements.
  - Final round of balancing and bug fixing.

---

This revised plan integrates architectural improvements and testing earlier, providing a more structured path for building complexity while maintaining code quality.
