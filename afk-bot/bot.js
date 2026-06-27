const bedrock = require("bedrock-protocol");
const http = require("http");

const SERVER_HOST = process.env.SERVER_HOST || "dream_smp786.aternos.me";
const SERVER_PORT = parseInt(process.env.SERVER_PORT) || 17512;
const BOT_NAME    = process.env.BOT_NAME    || "AFKBot";
const WEB_PORT    = parseInt(process.env.PORT) || 3000;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end(`Bot alive | Connected: ${isConnected} | Attempts: ${attemptNo}`);
}).listen(WEB_PORT, () => console.log(`[WEB] Port ${WEB_PORT}`));

let client, moveTimer, jumpTimer, reconnTimer, pingTimer;
let isConnected = false;
let attemptNo   = 0;
let posX = 0, posY = 64, posZ = 0;

const rand    = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max));

function clearTimers() {
  if (moveTimer)   clearInterval(moveTimer);
  if (jumpTimer)   clearInterval(jumpTimer);
  if (pingTimer)   clearInterval(pingTimer);
  if (reconnTimer) clearTimeout(reconnTimer);
  moveTimer = jumpTimer = pingTimer = reconnTimer = null;
}

function startNaturalMovement() {
  let yaw  = rand(0, 360);
  let tick = 0n;

  moveTimer = setInterval(() => {
    if (!client || !isConnected) return;
    tick += 1n;
    posX += rand(-0.05, 0.05);
    posZ += rand(-0.05, 0.05);
    yaw   = (yaw + rand(-10, 10) + 360) % 360;
    try {
      client.queue("move_player", {
        runtime_id: 1n,
        position: { x: posX, y: posY, z: posZ },
        pitch: rand(-3, 3),
        yaw, head_yaw: yaw,
        mode: 0, on_ground: true,
        ridden_runtime_id: 0n,
        cause: { type: 0, entity_id: 0n },
        tick,
      });
    } catch (e) {}
  }, randInt(10000, 15000));

  jumpTimer = setInterval(() => {
    if (!client || !isConnected) return;
    try {
      client.queue("player_action", {
        runtime_id: 1n, action: 2,
        position: { x: Math.floor(posX), y: Math.floor(posY), z: Math.floor(posZ) },
        result_position: { x: Math.floor(posX), y: Math.floor(posY), z: Math.floor(posZ) },
        face: 0,
      });
    } catch (e) {}
  }, randInt(30000, 50000));

  pingTimer = setInterval(() => {
    if (!client || !isConnected) return;
    try {
      client.queue("tick_sync", {
        request_time: BigInt(Date.now()),
        response_time: 0n,
      });
    } catch (e) {}
  }, 4000);
}

function connect() {
  clearTimers();
  isConnected = false;
  attemptNo++;
  console.log(`\n[BOT] Attempt #${attemptNo} → ${SERVER_HOST}:${SERVER_PORT}`);

  try {
    client = bedrock.createClient({
      host:           SERVER_HOST,
      port:           SERVER_PORT,
      username:       BOT_NAME,
      offline:        true,
      version:        "1.21.90",
      skipPing:       false,   // Proper handshake karo
      connectTimeout: 20000,
    });
  } catch (err) {
    console.error("[BOT] Client error:", err.message);
    scheduleReconnect(5000);
    return;
  }

  client.on("join", () => {
    isConnected = true;
    console.log(`✅ [BOT] JOINED! Attempt #${attemptNo}`);
    setTimeout(() => { if (isConnected) startNaturalMovement(); }, 3000);
  });

  client.on("text", (p) => {
    if (p.source_name) console.log(`[CHAT] ${p.source_name}: ${p.message}`);
  });

  client.on("spawn", () => {
    console.log(`[BOT] Spawned in world`);
  });

  client.on("disconnect", (p) => {
    isConnected = false;
    const reason = p?.message || "unknown";
    console.warn(`⚠️  Disconnect: ${reason}`);
    clearTimers();
    if      (reason.includes("notAuthenticated")) scheduleReconnect(10000);
    else if (reason.includes("serverFull"))       scheduleReconnect(15000);
    else                                          scheduleReconnect(4000);
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
      console.warn("🔌 Connection closed unexpectedly");
      clearTimers();
      scheduleReconnect(4000);
    }
  });
}

function scheduleReconnect(delay = 4000) {
  if (reconnTimer) return;
  console.log(`[BOT] ${delay / 1000}s baad reconnect...`);
  reconnTimer = setTimeout(() => { reconnTimer = null; connect(); }, delay);
}

process.on("uncaughtException",  (err) => { console.error("[CRASH]",  err.message); clearTimers(); scheduleReconnect(5000); });
process.on("unhandledRejection", (r)   => { console.error("[REJECT]", r); });

console.log("=".repeat(50));
console.log(` AFK Bot v7.0`);
console.log(`  Server: ${SERVER_HOST}:${SERVER_PORT}`);
console.log("=".repeat(50));
connect();
