const bedrock = require("bedrock-protocol");

// ============================================================
//  APNA SERVER IP AUR PORT YAHAN DALE (Aternos wala)
// ============================================================
const SERVER_HOST = process.env.SERVER_HOST || "dream_smp786.aternos.me";
const SERVER_PORT = parseInt(process.env.SERVER_PORT) || 17512;
const BOT_NAME    = process.env.BOT_NAME    || "AFKBot";
// ============================================================

const RECONNECT_DELAY_MS = 15 * 1000;   // 15 seconds baad reconnect
const MOVE_INTERVAL_MS   = 30 * 1000;   // 30 seconds mein ek baar move
const JUMP_INTERVAL_MS   = 60 * 1000;   // 60 seconds mein ek baar jump

let client      = null;
let moveTimer   = null;
let jumpTimer   = null;
let reconnTimer = null;
let isConnected = false;
let attemptNo   = 0;

// ─────────────────────────────────────────────
//  Cleanup: timers band karo
// ─────────────────────────────────────────────
function clearTimers() {
  if (moveTimer)   { clearInterval(moveTimer);   moveTimer   = null; }
  if (jumpTimer)   { clearInterval(jumpTimer);   jumpTimer   = null; }
  if (reconnTimer) { clearTimeout(reconnTimer);  reconnTimer = null; }
}

// ─────────────────────────────────────────────
//  Movement packets bhejo taake kick na ho
// ─────────────────────────────────────────────
function startMoving() {
  let yaw = 0;

  moveTimer = setInterval(() => {
    if (!client || !isConnected) return;

    yaw = (yaw + 45) % 360; // har baar 45° rotate

    try {
      client.queue("move_player", {
        runtime_id:    1n,
        position:      { x: 0, y: 64, z: 0 },
        pitch:         0,
        yaw:           yaw,
        head_yaw:      yaw,
        mode:          0,
        on_ground:     true,
        ridden_runtime_id: 0n,
        cause:         { type: 0, entity_id: 0n },
        tick:          0n,
      });
      console.log(`[MOVE] Rotation: ${yaw}°`);
    } catch (e) {
      // Packet fail ho toh ignore karo
    }
  }, MOVE_INTERVAL_MS);

  jumpTimer = setInterval(() => {
    if (!client || !isConnected) return;
    try {
      // Player Action: jump (action_id = 2 = jump)
      client.queue("player_action", {
        runtime_id: 1n,
        action:     2,
        position:   { x: 0, y: 64, z: 0 },
        result_position: { x: 0, y: 64, z: 0 },
        face:       0,
      });
      console.log("[JUMP] Bot ne jump kiya");
    } catch (e) {
      // ignore
    }
  }, JUMP_INTERVAL_MS);
}

// ─────────────────────────────────────────────
//  Server se connect karo
// ─────────────────────────────────────────────
function connect() {
  clearTimers();
  isConnected = false;
  attemptNo++;

  console.log(`\n[BOT] Connection attempt #${attemptNo}`);
  console.log(`[BOT] Server: ${SERVER_HOST}:${SERVER_PORT}`);
  console.log(`[BOT] Username: ${BOT_NAME}`);

  try {
    client = bedrock.createClient({
      host:            SERVER_HOST,
      port:            SERVER_PORT,
      username:        BOT_NAME,
      offline:         true,          // offline mode (Aternos free = no Xbox auth needed usually)
      version:         "1.21.90",     // Bedrock 1.21.90
      skipPing:        false,
      connectTimeout:  30000,
    });
  } catch (err) {
    console.error("[BOT] Client banane mein error:", err.message);
    scheduleReconnect();
    return;
  }

  // ── Connected ──────────────────────────────
  client.on("join", () => {
    isConnected = true;
    console.log(`\n✅ [BOT] Server join kar liya! (attempt #${attemptNo})`);
    startMoving();
  });

  // ── Text/chat messages ─────────────────────
  client.on("text", (packet) => {
    console.log(`[CHAT] ${packet.source_name}: ${packet.message}`);
  });

  // ── Disconnect ─────────────────────────────
  client.on("disconnect", (packet) => {
    isConnected = false;
    const reason = packet?.message || "Unknown reason";
    console.warn(`\n⚠️  [BOT] Disconnect hua: ${reason}`);
    clearTimers();
    scheduleReconnect();
  });

  // ── Error ──────────────────────────────────
  client.on("error", (err) => {
    isConnected = false;
    console.error(`\n❌ [BOT] Error: ${err.message}`);
    clearTimers();
    scheduleReconnect();
  });

  // ── Close ──────────────────────────────────
  client.on("close", () => {
    if (isConnected) {
      isConnected = false;
      console.warn("\n🔌 [BOT] Connection close ho gayi");
      clearTimers();
      scheduleReconnect();
    }
  });
}

// ─────────────────────────────────────────────
//  Reconnect schedule karo
// ─────────────────────────────────────────────
function scheduleReconnect() {
  if (reconnTimer) return; // pehle se scheduled hai
  console.log(`[BOT] ${RECONNECT_DELAY_MS / 1000} seconds baad reconnect hoga...`);
  reconnTimer = setTimeout(() => {
    reconnTimer = null;
    connect();
  }, RECONNECT_DELAY_MS);
}

// ─────────────────────────────────────────────
//  Process crash se bachao
// ─────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  console.error("[CRASH] Uncaught Exception:", err.message);
  clearTimers();
  scheduleReconnect();
});

process.on("unhandledRejection", (reason) => {
  console.error("[CRASH] Unhandled Rejection:", reason);
});

// ─────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────
console.log("=".repeat(50));
console.log(" Minecraft Bedrock AFK Bot - v1.0");
console.log(" Aternos Server 24/7 Online Rakhne Ke Liye");
console.log("=".repeat(50));

connect();
