# Minecraft Bedrock AFK Bot 🤖
## Aternos Server 24/7 Online Rakhne Ke Liye

---

## FILES:
- `bot.js` - Bot ka main code
- `package.json` - Dependencies
- `render.yaml` - Render.com config

---

## STEP 1 - Apna Aternos IP/Port Dalo

`bot.js` file mein line 7-8 edit karo:
```
const SERVER_HOST = "your-server.aternos.me";  // <-- apna IP
const SERVER_PORT = 19132;                       // <-- apna port
```

YA `render.yaml` mein envVars section mein dalo (recommended).

---

## STEP 2 - GitHub Pe Upload Karo

1. GitHub account banao (agar nahi hai): https://github.com
2. New repository banao (name: `minecraft-afk-bot`)
3. Yeh teeno files upload karo

---

## STEP 3 - Render.com Pe Deploy Karo

1. https://render.com pe jao, free account banao
2. "New +" → "Background Worker" select karo
3. Apna GitHub repo connect karo
4. Settings:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node bot.js`
5. Environment Variables mein add karo:
   - `SERVER_HOST` = tumhara Aternos address (e.g., `myserver.aternos.me`)
   - `SERVER_PORT` = tumhara port (e.g., `19132`)
   - `BOT_NAME` = `AFKBot`
6. "Create Background Worker" click karo

---

## IMPORTANT NOTES ⚠️

- **Aternos offline mode**: Free Aternos servers mein bot bina Xbox Live auth ke join kar sakta hai
- **Aternos shutdown**: Aternos backend se bhi server band kar sakta hai - agar aisa ho toh Aternos Discord pe "keep server online" plugin dhundo
- Bot automatically reconnect karta hai jab bhi disconnect ho
- Render free tier mein background workers 24/7 chalte hain

---

## Bot Kya Karta Hai:
✅ Server join karta hai  
✅ Har 30 second mein rotate karta hai (AFK kick se bachne ke liye)  
✅ Har 60 second mein jump karta hai  
✅ Disconnect hone pe automatically 15 second baad reconnect karta hai  
✅ Crash hone pe bhi recover karta hai  
