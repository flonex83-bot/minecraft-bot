const bedrock = require("bedrock-protocol");
const http = require("http");

// ============================================================
const SERVER_HOST = process.env.SERVER_HOST || "dream_smp786.aternos.me";
const SERVER_PORT = parseInt(process.env.SERVER_PORT) || 17512;
const BOT_NAME    = process.env.BOT_NAME    || "AFKBot";
const WEB_PORT    = parseInt(process.env.PORT) || 3000;
// ============================================================

// ── HTTP Server (Render alive rakhne ke liye) ───────────────
const webServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(`Bot Running | Connected: ${isConnected} | Attempts: ${attemptNo}`);
});
webServer.listen(WEB_PORT, () => {
  console.log(`[WEB] Port ${WEB_PORT} pe alive`);
});

// ── Config ──────────────────────────────────────────────────
const RECONNECT_FAST_MS  = 3 * 1000;   // 3 sec - pehle try
const RECONNECT_SLOW_MS  = 8 * 1000;   // 8 sec - baad mein
const MOVE_INTERVAL_MS   = 15 * 1000;  // 15 sec mein move
const JUMP_INTERVAL_MS   = 30 * 1000;  // 30 sec mein jump
const PING_INTERVAL_MS   = 10 * 1000;  // 10 sec mein keep-alive packet

let client, moveTimer, jumpTimer, reconnTimer, pingTimer;
let isConnected = false;
let attemptNo   = 0;
let failCount   = 0; // kitni baar fail hua

function clearTimers() {
  if (moveTimer)   { clearInterval(moveTimer);  moveTimer   = null; }
  if (jumpTimer)   { clearInterval(jumpTimer);  jumpTimer   = null; }
  if (reconnTimer) { clearTimeout(reconnTimer); reconnTimer = null; }
  if (pingTimer)   { clearInterval(pingTimer);  pingTimer   = null; }
}

// ── Keep-alive packets ──────────────────────────────────────
function startKeepAlive() {
  let yaw = 0;

  // Har 15 sec mein rotate
  moveTimer = setInterval(() => {
    if (!client || !isConnected) return;
    yaw = (yaw + 30) % 360;
    try {
      client.queue("move_player", {
        runtime_id: 1n,
        position: { x: 0, y: 64, z: 0 },
        pitch: 0, yaw: yaw, head_yaw: yaw,
        mode: 0, on_ground: true,
        ridden_runtime_id: 0n,
        cause: { type: 0, entity_id: 0n },
        tick: 0n,
      });
      console.log(`[MOVE] Yaw: ${yaw}°`);
    } catch (e) {}
  }, MOVE_INTERVAL_MS);

  // Har 30 sec mein jump
  jumpTimer = setInterval(() => {
    if (!client || !isConnected) return;
    try {
      client.queue("player_action", {
        runtime_id: 1n, action: 2,
        position: { x: 0, y: 64, z: 0 },
        result_position: { x: 0, y: 64, z: 0 },
        face: 0,
      });
      console.log(`[JUMP] Bot ne jump kiya`);
    } catch (e) {}
  }, JUMP_INTERVAL_MS);

  // Har 10 sec mein ping packet - connection stable rakhta hai
  pingTimer = setInterval(() => {
    if (!client || !isConnected) return;
    try {
      client.queue("tick_sync", {
        request_time: BigInt(Date.now()),
        response_time: 0n,
      });
    } catch (e) {}
  }, PING_INTERVAL_MS);
}

// ── Connect ─────────────────────────────────────────────────
function connect() {
  clearTimers();
  isConnected = false;
  attemptNo++;

  console.log(`\n[BOT] Attempt #${attemptNo} connecting to ${SERVER_HOST}:${SERVER_PORT}`);

  try {
    client = bedrock.createClient({
      host:           SERVER_HOST,
      port:           SERVER_PORT,
      username:       BOT_NAME,
      offline:        true,
      version:        "1.21.90",
      skipPing:       true,
      connectTimeout: 15000, // 15 sec timeout
    });
  } catch (err) {
    console.error("[BOT] Client error:", err.message);
    failCount++;
    scheduleReconnect();
    return;
  }

  client.on("join", () => {
    isConnected = true;
    failCount   = 0; // reset fail count
    console.log(`\n✅ [BOT] JOINED! Attempt #${attemptNo}`);
    startKeepAlive();
  });

  client.on("text", (p) => {
    if (p.source_name) console.log(`[CHAT] ${p.source_name}: ${p.message}`);
  });

  client.on("disconnect", (p) => {
    const wasConnected = isConnected;
    isConnected = false;
    const reason = p?.message || "unknown";
    console.warn(`⚠️  [BOT] Disconnect: ${reason}`);
    clearTimers();

    // notAuthenticated = Cracked OFF hai, thoda wait karo
    if (reason.includes("notAuthenticated")) {
      console.error("❌ Aternos mein Cracked ON karo! Options > Cracked > Enable");
      scheduleReconnect(15000);
    } else {
      // Normal disconnect - turant reconnect
      scheduleReconnect(wasConnected ? RECONNECT_FAST_MS : RECONNECT_SLOW_MS);
    }
  });

  client.on("error", (err) => {
    isConnected = false;
    console.error(`❌ [BOT] Error: ${err.message}`);
    clearTimers();
    failCount++;
    // Server shayad off hai, thoda wait karo
    const delay = failCount > 3 ? RECONNECT_SLOW_MS : RECONNECT_FAST_MS;
    scheduleReconnect(delay);
  });

  client.on("close", () => {
    if (isConnected) {
      isConnected = false;
      console.warn("🔌 [BOT] Connection closed");
      clearTimers();
      scheduleReconnect(RECONNECT_FAST_MS);
    }
  });
}

// ── Reconnect ───────────────────────────────────────────────
function scheduleReconnect(delay = RECONNECT_FAST_MS) {
  if (reconnTimer) return;
  console.log(`[BOT] ${delay/1000}s baad reconnect hoga...`);
  reconnTimer = setTimeout(() => {
    reconnTimer = null;
    connect();
  }, delay);
}

// ── Crash protection ────────────────────────────────────────
process.on("uncaughtException", (err) => {
  console.error("[CRASH]", err.message);
  clearTimers();
  scheduleReconnect(RECONNECT_SLOW_MS);
});
process.on("unhandledRejection", (r) => {
  console.error("[REJECT]", r);
});

// ── START ───────────────────────────────────────────────────
console.log("=".repeat(50));
console.log(" AFK Bot v5.0 - Ultra Fast Reconnect");
console.log(`" Server: ${SERVER_HOST}:${SERVER_PORT}`);
console.log("=".repeat(50));
connect();
