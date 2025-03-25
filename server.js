const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Store connected players
const players = {};

// Serve static files
app.use(express.static("dist"));

// Serve the main app for any other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Add new player to players object
  players[socket.id] = {
    id: socket.id,
    position: { x: 0, y: 2, z: 15 },
    rotation: { x: 0, y: 0, z: 0 },
    leanAmount: 0,
    team: Object.keys(players).length % 2 === 0 ? "blue" : "red", // Assign to alternating teams
    health: 100, // Add health property
  };

  // Send welcome message to the newly connected client
  socket.emit("message", "Welcome to Rainbow Three Jay's!");

  // Send current players to the new player
  socket.emit("currentPlayers", players);

  // Broadcast new player to all clients except the sender
  socket.broadcast.emit("newPlayer", players[socket.id]);
  socket.broadcast.emit("message", `User ${socket.id} joined the game`);

  // Handle player updates
  socket.on("playerUpdate", (data) => {
    if (players[socket.id]) {
      // Update player data with what client sent
      players[socket.id].position = data.position;
      players[socket.id].rotation = data.rotation;
      players[socket.id].leanAmount = data.leanAmount;

      // Broadcast player update to all other clients
      socket.broadcast.emit("playerMoved", {
        id: socket.id,
        position: players[socket.id].position,
        rotation: players[socket.id].rotation,
        leanAmount: players[socket.id].leanAmount,
      });
    }
  });

  // Handle player shooting events
  socket.on("playerShot", (data) => {
    const targetId = data.targetId;
    const damage = data.damage || 25; // Default damage if not specified

    // Skip if target is the dummy player (it's handled client-side)
    if (targetId === "dummy") {
      return;
    }

    // Check if target player exists
    if (players[targetId]) {
      // Get shooter and target teams
      const shooterTeam = players[socket.id]?.team;
      const targetTeam = players[targetId].team;

      // Skip damage if friendly fire (same team)
      if (shooterTeam === targetTeam) {
        console.log("Friendly fire detected, no damage applied");
        return;
      }

      // Apply damage to target player
      players[targetId].health -= damage;

      // Check if player is dead
      if (players[targetId].health <= 0) {
        players[targetId].health = 0;

        // Reset player health after 5 seconds (simple respawn mechanic)
        setTimeout(() => {
          if (players[targetId]) {
            players[targetId].health = 100;
            io.to(targetId).emit("playerRespawned");
          }
        }, 5000);
      }

      // Send hit notification to target player
      io.to(targetId).emit("playerHit", {
        shooterId: socket.id,
        damage: damage,
        remainingHealth: players[targetId].health,
      });

      // Send hit confirmation to shooter
      socket.emit("hitConfirmed", {
        targetId: targetId,
        damage: damage,
        remainingHealth: players[targetId].health,
      });

      console.log(
        `Player ${socket.id} hit player ${targetId} for ${damage} damage. Remaining health: ${players[targetId].health}`
      );
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Remove player from players object
    delete players[socket.id];

    // Broadcast to all clients that player has left
    io.emit("playerDisconnected", socket.id);
    io.emit("message", `User ${socket.id} left the game`);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
