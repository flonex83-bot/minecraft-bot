const bedrock = require("bedrock-protocol");
const http = require("http");

const SERVER_HOST = process.env.SERVER_HOST || "dream_smp786.aternos.me";
const SERVER_PORT = parseInt(process.env.SERVER_PORT) || 17512;
const BOT_NAME    = process.env.BOT_NAME    || "AFKBot";
const WEB_PORT    = parseInt(process.env.PORT) || 3000;

let isConnected = false;
let attemptNo   = 0;
let client      = null;
let moveTimer   = null;
let jumpTimer   = null;
let pingTimer   = null;

// ── HTTP keep-alive ─────────────────────────────────────────
http.createServer((req, res) => {
  res.writeHead(200);
  res.end(`alive|connected:${isConnected}|attempts:${attemptNo}`);
}).listen(WEB_PORT, () => console.log(`[WEB] Port ${WEB_PORT} OK`));

// ── Timers ──────────────────────────────────────────────────
function clearTimers() {
  if (moveTimer) { clearInterval(moveTimer); moveTimer = null; }
  if (jumpTimer) { clearInterval(jumpTimer); jumpTimer = null; }
  if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
}

// ── Movement - natural aur slow ─────────────────────────────
function startMovement() {
  let yaw  = Math.random() * 360;
  let posX = 0, posY = 64, posZ = 0;
  let tick = 0n;

  // Har 12 sec mein thoda move
  moveTimer = setInterval(() => {
    if (!client || !isConnected) return;
    tick += 1n;
    posX += (Math.random() - 0.5) * 0.02;
    posZ += (Math.random() - 0.5) * 0.02;
    yaw   = (yaw + (Math.random() - 0.5) * 5 + 360) % 360;
    try {
      client.queue("move_player", {
        runtime_id:        1n,
        position:          { x: posX, y: posY, z: posZ },
        pitch:             0,
        yaw:               yaw,
        head_yaw:          yaw,
        mode:              0,
        on_ground:         true,
        ridden_runtime_id: 0n,
        cause:             { type: 0, entity_id: 0n },
        tick:              tick,
      });
    } catch (_) {}
  }, 12000);

  // Har 40 sec mein jump
  jumpTimer = setInterval(() => {
    if (!client || !isConnected) return;
    try {
      client.queue("player_action", {
        runtime_id:      1n,
        action:          2,
        position:        { x: 0, y: 64, z: 0 },
        result_position: { x: 0, y: 64, z: 0 },
        face:            0,
      });
      console.log("[BOT] Jump");
    } catch (_) {}
  }, 40000);

  // Har 3 sec mein tick_sync - connection zinda rakhta hai
  pingTimer = setInterval(() => {
    if (!client || !isConnected) return;
    try {
      client.queue("tick_sync", {
        request_time:  BigInt(Date.now()),
        response_time: 0n,
      });
    } catch (_) {}
  }, 3000);

  console.log("[BOT] Movement + ping started");
}

// ── CONNECT - sirf ek baar, reconnect nahi ──────────────────
function connect() {
  clearTimers();
  isConnected = false;
  attemptNo++;
  console.log(`[BOT] Attempt #${attemptNo} → ${SERVER_HOST}:${SERVER_PORT}`);

  try {
    client = bedrock.createClient({
      host:              SERVER_HOST,
      port:              SERVER_PORT,
      username:          BOT_NAME,
      offline:           true,
      version:           "1.21.90",
      skipPing:          true,   // Aternos ka port scan nahi karega
      connectTimeout:    30000,
    });
  } catch (err) {
    console.error("[BOT] Create error:", err.message);
    setTimeout(connect, 5000);
    return;
  }

  client.on("join", () => {
    isConnected = true;
    console.log(`\n✅✅✅ [BOT] JOINED! Attempt #${attemptNo} ✅✅✅\n`);
    // 2 sec baad movement shuru
    setTimeout(() => { if (isConnected) startMovement(); }, 2000);
  });

  client.on("spawn", () => {
    console.log("[BOT] World mein spawn hua");
  });

  client.on("text", (p) => {
    if (p.source_name) console.log(`[CHAT] ${p.source_name}: ${p.message}`);
  });

  // ── DISCONNECT handler ──────────────────────────────────
  client.on("disconnect", (p) => {
    isConnected = false;
    const reason = p?.message || "no reason";
    console.warn(`\n⚠️  [BOT] Disconnect: ${reason}`);
    clearTimers();

    // Reason ke mutabiq wait karo
    let delay = 5000;
    if (reason.includes("notAuthenticated")) {
      console.error("❌ Aternos mein Cracked ON karo! Options > Cracked > Enable");
      delay = 15000;
    } else if (reason.includes("serverFull")) {
      delay = 20000;
    } else if (reason.includes("outdated") || reason.includes("version")) {
      console.error("❌ Version mismatch!");
      delay = 10000;
    }

    console.log(`[BOT] ${delay/1000}s baad reconnect...`);
    setTimeout(connect, delay);
  });

  client.on("error", (err) => {
    isConnected = false;
    console.error(`❌ [BOT] Error: ${err.message}`);
    clearTimers();
    setTimeout(connect, 5000);
  });

  client.on("close", () => {
    if (isConnected) {
      isConnected = false;
      console.warn("🔌 [BOT] Connection closed");
      clearTimers();
      setTimeout(connect, 5000);
    }
  });
}

process.on("uncaughtException",  (e) => { console.error("[CRASH]",  e.message); clearTimers(); setTimeout(connect, 5000); });
process.on("unhandledRejection", (r) => { console.error("[REJECT]", r); });

console.log("=".repeat(50));
console.log(` AFK Bot v8.0 - Stable Connection`);
console.log(`  ${SERVER_HOST}:${SERVER_PORT}`);
console.log("=".repeat(50));
connect();
