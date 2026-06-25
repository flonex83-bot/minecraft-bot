const bedrock = require("bedrock-protocol");

// ============================================================
//  CONFIG - Render Environment Variables se aata hai
// ============================================================
const SERVER_HOST = process.env.SERVER_HOST || "dream_smp786.aternos.me";
const SERVER_PORT = parseInt(process.env.SERVER_PORT) || 17512;
const BOT_NAME    = process.env.BOT_NAME    || "AFKBot";
// ============================================================

const RECONNECT_DELAY_MS = 20 * 1000;
const MOVE_INTERVAL_MS   = 20 * 1000;
const JUMP_INTERVAL_MS   = 45 * 1000;

let client      = null;
let moveTimer   = null;
let jumpTimer   = null;
let reconnTimer = null;
let isConnected = false;
let attemptNo   = 0;

function clearTimers() {
  if (moveTimer)   { clearInterval(moveTimer);  moveTimer   = null; }
  if (jumpTimer)   { clearInterval(jumpTimer);  jumpTimer   = null; }
  if (reconnTimer) { clearTimeout(reconnTimer); reconnTimer = null; }
}

function startMoving() {
  let yaw = 0;
  moveTimer = setInterval(() => {
    if (!client || !isConnected) return;
    yaw = (yaw + 45) % 360;
    try {
      client.queue("move_player", {
        runtime_id: 1n,
        position: { x: 0, y: 64, z: 0 },
        pitch: 0,
        yaw: yaw,
        head_yaw: yaw,
        mode: 0,
        on_ground: true,
        ridden_runtime_id: 0n,
        cause: { type: 0, entity_id: 0n },
        tick: 0n,
      });
    } catch (e) {}
  }, MOVE_INTERVAL_MS);

  jumpTimer = setInterval(() => {
    if (!client || !isConnected) return;
    try {
      client.queue("player_action", {
        runtime_id: 1n,
        action: 2,
        position: { x: 0, y: 64, z: 0 },
        result_position: { x: 0, y: 64, z: 0 },
        face: 0,
      });
    } catch (e) {}
  }, JUMP_INTERVAL_MS);
}

function connect() {
  clearTimers();
  isConnected = false;
  attemptNo++;

  console.log(`\n[BOT] Attempt #${attemptNo} - ${SERVER_HOST}:${SERVER_PORT}`);

  try {
    client = bedrock.createClient({
      host:           SERVER_HOST,
      port:           SERVER_PORT,
      username:       BOT_NAME,
      offline:        false,        // Microsoft auth use karega
      version:        "1.21.90",
      skipPing:       true,
      connectTimeout: 30000,
    });
  } catch (err) {
    console.error("[BOT] Error:", err.message);
    scheduleReconnect();
    return;
  }

  // Yeh event tab fire hota hai jab Microsoft login URL generate ho
  client.on("microsoft_auth_flow", ({ link }) => {
    console.log("\n" + "=".repeat(60));
    console.log("🔐 MICROSOFT LOGIN REQUIRED!");
    console.log("=".repeat(60));
    console.log("Browser mein yeh link kholo:");
    console.log(link);
    console.log("=".repeat(60));
    console.log("Upar wala link kholo, Microsoft account se login karo");
    console.log("Token automatically save ho jayega");
    console.log("=".repeat(60) + "\n");
  });

  client.on("join", () => {
    isConnected = true;
    console.log(`\n✅ [BOT] Server join kar liya! (attempt #${attemptNo})`);
    startMoving();
  });

  client.on("text", (packet) => {
    if (packet.source_name) {
      console.log(`[CHAT] ${packet.source_name}: ${packet.message}`);
    }
  });

  client.on("disconnect", (packet) => {
    isConnected = false;
    console.warn(`\n⚠️  [BOT] Disconnect: ${packet?.message || "unknown"}`);
    clearTimers();
    scheduleReconnect();
  });

  client.on("error", (err) => {
    isConnected = false;
    console.error(`\n❌ [BOT] Error: ${err.message}`);
    clearTimers();
    scheduleReconnect();
  });

  client.on("close", () => {
    if (isConnected) {
      isConnected = false;
      clearTimers();
      scheduleReconnect();
    }
  });
}

function scheduleReconnect() {
  if (reconnTimer) return;
  console.log(`[BOT] ${RECONNECT_DELAY_MS / 1000}s baad reconnect...`);
  reconnTimer = setTimeout(() => { reconnTimer = null; connect(); }, RECONNECT_DELAY_MS);
}

process.on("uncaughtException", (err) => {
  console.error("[CRASH]", err.message);
  clearTimers();
  scheduleReconnect();
});

process.on("unhandledRejection", (reason) => {
  console.error("[REJECT]", reason);
});

console.log("=".repeat(50));
console.log(" Minecraft Bedrock AFK Bot v2.0");
console.log(" Microsoft Auth Mode");
console.log("=".repeat(50));

connect();
