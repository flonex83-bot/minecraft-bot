const bedrock = require("bedrock-protocol");
const http    = require("http");
const dns     = require("dns").promises;

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
let reconnTimer = null;

// ── HTTP keep-alive ─────────────────────────────────────────
http.createServer((req, res) => {
  res.writeHead(200);
  res.end(`alive|connected:${isConnected}|attempts:${attemptNo}`);
}).listen(WEB_PORT, () => console.log(`[WEB] Port ${WEB_PORT} OK`));

// ── Timers ──────────────────────────────────────────────────
function clearTimers() {
  if (moveTimer)   { clearInterval(moveTimer);  moveTimer   = null; }
  if (jumpTimer)   { clearInterval(jumpTimer);  jumpTimer   = null; }
  if (pingTimer)   { clearInterval(pingTimer);  pingTimer   = null; }
  if (reconnTimer) { clearTimeout(reconnTimer); reconnTimer = null; }
}

// ── Natural Movement ────────────────────────────────────────
function startMovement() {
  let yaw  = Math.random() * 360;
  let posX = 0, posY = 64, posZ = 0;
  let tick = 0n;

  moveTimer = setInterval(() => {
    if (!client || !isConnected) return;
    tick += 1n;
    posX += (Math.random() - 0.5) * 0.02;
    posZ += (Math.random() - 0.5) * 0.02;
    yaw   = (yaw + (Math.random() - 0.5) * 5 + 360) % 360;
    try {
      client.queue("move_player", {
        runtime_id: 1n,
        position: { x: posX, y: posY, z: posZ },
        pitch: 0, yaw, head_yaw: yaw,
        mode: 0, on_ground: true,
        ridden_runtime_id: 0n,
        cause: { type: 0, entity_id: 0n },
        tick,
      });
    } catch (_) {}
  }, 12000);

  jumpTimer = setInterval(() => {
    if (!client || !isConnected) return;
    try {
      client.queue("player_action", {
        runtime_id: 1n, action: 2,
        position: { x: 0, y: 64, z: 0 },
        result_position: { x: 0, y: 64, z: 0 },
        face: 0,
      });
      console.log("[BOT] Jump");
    } catch (_) {}
  }, 40000);

  pingTimer = setInterval(() => {
    if (!client || !isConnected) return;
    try {
      client.queue("tick_sync", {
        request_time:  BigInt(Date.now()),
        response_time: 0n,
      });
    } catch (_) {}
  }, 3000);

  console.log("[BOT] Movement started");
}

// ── Aternos ka real port dhundho SRV record se ─────────────
async function getRealPort() {
  try {
    const records = await dns.resolveSrv(`_minecraft._udp.${SERVER_HOST}`);
    if (records && records.length > 0) {
      console.log(`[DNS] SRV port mila: ${records[0].port}`);
      return records[0].port;
    }
  } catch (_) {}

  // SRV na mile toh ping se port lo
  try {
    const ping = await bedrock.ping({ host: SERVER_HOST, port: SERVER_PORT });
    console.log(`[PING] Server online, port: ${SERVER_PORT}`);
    return SERVER_PORT;
  } catch (e) {
    console.log(`[PING] Ping failed: ${e.message}`);
    return SERVER_PORT; // default use karo
  }
}

// ── CONNECT ─────────────────────────────────────────────────
async function connect() {
  clearTimers();
  isConnected = false;
  attemptNo++;
  console.log(`\n[BOT] Attempt #${attemptNo} → ${SERVER_HOST}`);

  // Har baar fresh port lo
  const port = await getRealPort();
  console.log(`[BOT] Connecting on port: ${port}`);

  try {
    client = bedrock.createClient({
      host:           SERVER_HOST,
      port:           port,
      username:       BOT_NAME,
      offline:        true,
      version:        "1.21.90",
      skipPing:       true,
      connectTimeout: 25000,
    });
  } catch (err) {
    console.error("[BOT] Create error:", err.message);
    scheduleReconnect(5000);
    return;
  }

  client.on("join", () => {
    isConnected = true;
    console.log(`\n✅✅✅ [BOT] JOINED! ✅✅✅\n`);
    setTimeout(() => { if (isConnected) startMovement(); }, 2000);
  });

  client.on("spawn", () => console.log("[BOT] Spawned!"));

  client.on("text", (p) => {
    if (p.source_name) console.log(`[CHAT] ${p.source_name}: ${p.message}`);
  });

  client.on("disconnect", (p) => {
    isConnected = false;
    const reason = p?.message || "unknown";
    console.warn(`⚠️  Disconnect: ${reason}`);
    clearTimers();

    // Version error - supported versions nikal lo
    if (reason.includes("Outdated") || reason.includes("version")) {
      const match = reason.match(/(\d+\.\d+(?:\.\d+)?)\s*$/);
      if (match) console.log(`[BOT] Server version hint: ${match[1]}`);
      scheduleReconnect(8000);
    } else if (reason.includes("notAuthenticated")) {
      console.error("❌ Aternos Options > Cracked ON karo!");
      scheduleReconnect(12000);
    } else {
      scheduleReconnect(5000);
    }
  });

  client.on("error", (err) => {
    isConnected = false;
    console.error(`❌ Error: ${err.message}`);
    clearTimers();
    scheduleReconnect(5000);
  });

  client.on("close", () => {
    if (isConnected) {
      isConnected = false;
      clearTimers();
      scheduleReconnect(5000);
    }
  });
}

function scheduleReconnect(delay = 5000) {
  if (reconnTimer) return;
  console.log(`[BOT] ${delay/1000}s baad reconnect...`);
  reconnTimer = setTimeout(() => { reconnTimer = null; connect(); }, delay);
}

process.on("uncaughtException",  (e) => { console.error("[CRASH]",  e.message); clearTimers(); scheduleReconnect(5000); });
process.on("unhandledRejection", (r) => console.error("[REJECT]", r));

console.log("=".repeat(50));
console.log(` AFK Bot v9.0 - Dynamic Port + 1.21.90`);
console.log(`  ${SERVER_HOST}:${SERVER_PORT}`);
console.log("=".repeat(50));
connect();
