const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode");
const pino = require("pino");

const PORT = process.env.WA_GATEWAY_PORT || 3001;
const CRM_WEBHOOK_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const os = require("os");
// Store sessions outside the Next.js workspace to prevent Turbopack watcher loops and page reloads
const SESSIONS_DIR = process.env.WA_AUTH_DIR || (
  process.env.NODE_ENV === "production"
    ? path.join(__dirname, ".wa_auth")
    : path.join(os.homedir(), ".crm_aceone_wa_auth")
);

if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// In-memory store for active multi-tenant sessions
// { [tenantId]: { sock, status: 'IDLE'|'QR_READY'|'CONNECTED'|'DISCONNECTED', qrDataUrl: null, phone: null, secretKey: null } }
const sessions = {};

const logger = pino({ level: "silent" });

// Process-wide error guards so gateway never crashes
process.on("uncaughtException", (err) => {
  console.error("[WhatsApp Gateway] Handled uncaught exception:", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("[WhatsApp Gateway] Handled unhandled rejection:", reason);
});

const connectingPromises = {};
const reconnectTimers = {};

async function initBaileysSession(tenantId, secretKey) {
  if (sessions[tenantId] && (sessions[tenantId].status === "CONNECTED" || sessions[tenantId].status === "INITIALIZING" || sessions[tenantId].status === "QR_READY")) {
    return sessions[tenantId];
  }

  // If initialization is already in flight for this tenant, reuse the promise to prevent duplicate sockets
  if (connectingPromises[tenantId]) {
    return connectingPromises[tenantId];
  }

  // Cancel any scheduled reconnect timer
  if (reconnectTimers[tenantId]) {
    clearTimeout(reconnectTimers[tenantId]);
    delete reconnectTimers[tenantId];
  }

  connectingPromises[tenantId] = (async () => {
    try {
      // 1. Cleanly terminate any leftover socket
      if (sessions[tenantId]?.sock) {
        try {
          sessions[tenantId].sock.ev.removeAllListeners();
          sessions[tenantId].sock.end(undefined);
        } catch (_) {}
        sessions[tenantId].sock = null;
      }

      const sessionPath = path.join(SESSIONS_DIR, tenantId);
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
      }

      if (!sessions[tenantId]) {
        sessions[tenantId] = {
          status: "INITIALIZING",
          qrDataUrl: null,
          phone: null,
          secretKey: secretKey || null,
          sock: null,
        };
      } else {
        sessions[tenantId].status = "INITIALIZING";
      }

      if (secretKey) {
        sessions[tenantId].secretKey = secretKey;
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: state,
        browser: ["AceOne CRM", "Chrome", "1.0.0"],
        syncFullHistory: false,
      });

      sessions[tenantId].sock = sock;

      sock.ev.on("creds.update", async () => {
        try {
          if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
          }
          await saveCreds();
        } catch (_) {}
      });

      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const qrUrl = await qrcode.toDataURL(qr, { margin: 2, scale: 7 });
            sessions[tenantId].qrDataUrl = qrUrl;
            sessions[tenantId].status = "QR_READY";
            console.log(`[WhatsApp Gateway] Live QR Code ready for tenant: ${tenantId}`);
          } catch (err) {
            console.error("QR Code generation error:", err);
          }
        }

        if (connection === "open") {
          const userJid = sock.user?.id || "";
          const rawPhone = userJid.split(":")[0] || userJid.split("@")[0];
          const formattedPhone = rawPhone.startsWith("+") ? rawPhone : "+" + rawPhone;

          sessions[tenantId].status = "CONNECTED";
          sessions[tenantId].phone = formattedPhone;
          sessions[tenantId].qrDataUrl = null;

          if (reconnectTimers[tenantId]) {
            clearTimeout(reconnectTimers[tenantId]);
            delete reconnectTimers[tenantId];
          }

          console.log(`✅ [WhatsApp Gateway] Linked device for Tenant "${tenantId}" - Phone: ${formattedPhone}`);

          // Notify CRM of successful link
          notifyCrmLink(tenantId, formattedPhone);
        }

        if (connection === "close") {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403;

          console.log(`[WhatsApp Gateway] Connection closed for ${tenantId}. Code: ${statusCode}. LoggedOut: ${isLoggedOut}`);

          // Clean up this socket
          try {
            sock.ev.removeAllListeners();
            sock.end(undefined);
          } catch (_) {}
          if (sessions[tenantId]?.sock === sock) {
            sessions[tenantId].sock = null;
          }

          if (isLoggedOut) {
            console.log(`[WhatsApp Gateway] Explicit logout confirmed for ${tenantId}. Purging stale credentials to generate fresh QR.`);
            sessions[tenantId].status = "DISCONNECTED";
            sessions[tenantId].phone = null;
            sessions[tenantId].qrDataUrl = null;

            try {
              fs.rmSync(sessionPath, { recursive: true, force: true });
            } catch (_) {}

            reconnectTimers[tenantId] = setTimeout(() => {
              delete reconnectTimers[tenantId];
              initBaileysSession(tenantId, sessions[tenantId]?.secretKey);
            }, 1000);
          } else if (statusCode === 440) {
            // Connection Replaced (Conflict) - Back off 10s before retry to prevent endless replacing loop
            console.log(`[WhatsApp Gateway] Connection replaced (440) for ${tenantId}. Backing off 10s...`);
            sessions[tenantId].status = "DISCONNECTED";
            reconnectTimers[tenantId] = setTimeout(() => {
              delete reconnectTimers[tenantId];
              initBaileysSession(tenantId, sessions[tenantId]?.secretKey);
            }, 10000);
          } else {
            const delay = statusCode === 515 ? 1500 : 3500;
            sessions[tenantId].status = "DISCONNECTED";
            reconnectTimers[tenantId] = setTimeout(() => {
              delete reconnectTimers[tenantId];
              initBaileysSession(tenantId, sessions[tenantId]?.secretKey);
            }, delay);
          }
        }
      });

      // Keep-alive presence ping every 30 seconds so connection stays permanently active
      const keepAlive = setInterval(async () => {
        try {
          if (sessions[tenantId]?.status === "CONNECTED" && sock?.ws?.readyState === 1) {
            await sock.sendPresenceUpdate("available");
          }
        } catch (_) {}
      }, 30000);

      // Listen to incoming messages (both live "notify" and offline backlog "append")
      sock.ev.on("messages.upsert", async ({ messages, type }) => {
        const isCatchup = type === "append";
        for (const msg of messages) {
          await processMessage(tenantId, msg, sock, isCatchup);
        }
      });

      // Listen to messaging-history.set for offline backlog delivered upon reconnection
      sock.ev.on("messaging-history.set", async ({ messages }) => {
        if (Array.isArray(messages)) {
          for (const msg of messages) {
            await processMessage(tenantId, msg, sock, true);
          }
        }
      });

      return sessions[tenantId];
    } finally {
      delete connectingPromises[tenantId];
    }
  })();

  return connectingPromises[tenantId];
}

function getSyncState(tenantId) {
  const statePath = path.join(SESSIONS_DIR, tenantId, "sync_state.json");
  try {
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, "utf8"));
    }
  } catch (_) {}
  return {
    lastProcessedTimestamp: Math.floor(Date.now() / 1000) - 300,
    processedMessageIds: [],
  };
}

function saveSyncState(tenantId, state) {
  const sessionPath = path.join(SESSIONS_DIR, tenantId);
  try {
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }
    if (state.processedMessageIds.length > 500) {
      state.processedMessageIds = state.processedMessageIds.slice(-500);
    }
    fs.writeFileSync(path.join(sessionPath, "sync_state.json"), JSON.stringify(state, null, 2), "utf8");
  } catch (_) {}
}

async function processMessage(tenantId, msg, sock, isCatchup = false) {
  if (!msg || !msg.key) return;
  const isOutbound = Boolean(msg.key.fromMe);

  const remoteJid = msg.key.remoteJid || "";

  // 1. Strict Filters: Ignore Statuses, Broadcasts, Family/Work Groups, and Newsletters
  if (
    remoteJid === "status@broadcast" ||
    remoteJid.includes("@broadcast") ||
    remoteJid.includes("broadcast") ||
    remoteJid.includes("@g.us") || // Ignore Groups
    remoteJid.includes("@newsletter") || // Ignore WhatsApp Channels / Newsletters
    remoteJid.includes("newsletter")
  ) {
    return;
  }

  // 2. Ignore protocol events (reactions, read receipts, message deletes, ephemeral timers)
  if (
    msg.message?.protocolMessage ||
    msg.message?.reactionMessage ||
    msg.message?.senderKeyDistributionMessage ||
    msg.messageStubType
  ) {
    return;
  }

  const msgId = msg.key.id;
  const syncState = getSyncState(tenantId);

  // 3. Deduplication check
  if (msgId && syncState.processedMessageIds.includes(msgId)) {
    return; // Already processed
  }

  // 4. For offline catchup / append messages: only process if within/after downtime
  if (isCatchup && msg.messageTimestamp) {
    const msgTimeSec = Number(msg.messageTimestamp);
    if (msgTimeSec < syncState.lastProcessedTimestamp) {
      return; // Old history message from before downtime
    }
  }

  // 5. Extract real user message text
  let messageText = "";
  if (msg.message?.conversation) {
    messageText = msg.message.conversation.trim();
  } else if (msg.message?.extendedTextMessage?.text) {
    messageText = msg.message.extendedTextMessage.text.trim();
  } else if (msg.message?.imageMessage?.caption) {
    messageText = msg.message.imageMessage.caption.trim() || "[Photo]";
  } else if (msg.message?.imageMessage) {
    messageText = "[Photo]";
  } else if (msg.message?.videoMessage?.caption) {
    messageText = msg.message.videoMessage.caption.trim() || "[Video]";
  } else if (msg.message?.videoMessage) {
    messageText = "[Video]";
  } else if (msg.message?.documentMessage) {
    messageText = msg.message.documentMessage.fileName
      ? `[Document: ${msg.message.documentMessage.fileName}]`
      : "[Document]";
  } else if (msg.message?.audioMessage) {
    messageText = "[Voice Note]";
  }

  if (!messageText || messageText.length === 0) {
    return;
  }

  const senderPhone = await resolveSenderPhone(tenantId, msg, sock);
  const cleanDigits = senderPhone.replace(/\D/g, "");

  // If number is longer than 15 digits (e.g. newsletter community channels), skip!
  if (cleanDigits.length > 15 || cleanDigits.length < 7) {
    return;
  }

  const pushName = isOutbound ? "" : (msg.pushName || "");

  // Extract accurate real message timestamp from WhatsApp packet
  let timestampIso = null;
  if (msg.messageTimestamp) {
    const rawVal = msg.messageTimestamp;
    const sec = typeof rawVal === "object" && rawVal !== null
      ? (rawVal.low || Number(rawVal))
      : Number(rawVal);
    if (!isNaN(sec) && sec > 0) {
      const ms = sec > 1e11 ? sec : sec * 1000;
      timestampIso = new Date(ms).toISOString();
    }
  }
  if (!timestampIso) {
    timestampIso = new Date().toISOString();
  }

  console.log(`💬 [WhatsApp Gateway] ${isOutbound ? "Outbound message to" : "Inbound inquiry from"} ${pushName} (${senderPhone}): "${messageText}" [Time: ${timestampIso}] [ID: ${msgId}]`);

  // Record into sync state
  if (msgId) {
    syncState.processedMessageIds.push(msgId);
  }
  if (msg.messageTimestamp) {
    syncState.lastProcessedTimestamp = Math.max(syncState.lastProcessedTimestamp, Number(msg.messageTimestamp));
  }
  saveSyncState(tenantId, syncState);

  // Forward to CRM Webhook sequentially
  await forwardMessageToCrm({
    tenantId,
    secretKey: sessions[tenantId]?.secretKey,
    from: senderPhone,
    name: pushName || "WhatsApp Contact",
    message: messageText,
    waMessageId: msgId,
    isOutbound,
    timestamp: timestampIso,
  });
}

async function resolveSenderPhone(tenantId, msg, sock) {
  const remoteJid = msg.key?.remoteJid || "";

  // 1. Direct standard JID: 923301249374@s.whatsapp.net
  if (remoteJid.endsWith("@s.whatsapp.net")) {
    const raw = remoteJid.split("@")[0].split(":")[0];
    return raw.startsWith("+") ? raw : "+" + raw;
  }

  // 2. Check if Baileys provides remoteJidAlt or participantPn
  if (msg.key?.remoteJidAlt && msg.key.remoteJidAlt.endsWith("@s.whatsapp.net")) {
    const raw = msg.key.remoteJidAlt.split("@")[0].split(":")[0];
    return raw.startsWith("+") ? raw : "+" + raw;
  }
  if (msg.key?.participantPn && !msg.key.participantPn.includes("lid")) {
    const raw = msg.key.participantPn.split("@")[0].split(":")[0];
    return raw.startsWith("+") ? raw : "+" + raw;
  }

  // 3. WhatsApp Multi-Device LID: e.g. 262444144427080@lid
  if (remoteJid.endsWith("@lid")) {
    const lid = remoteJid.split("@")[0].split(":")[0];
    const sessionPath = path.join(SESSIONS_DIR, tenantId);

    // Try reading reverse mapping file: lid-mapping-<lid>_reverse.json
    try {
      const reversePath = path.join(sessionPath, `lid-mapping-${lid}_reverse.json`);
      if (fs.existsSync(reversePath)) {
        const raw = JSON.parse(fs.readFileSync(reversePath, "utf8"));
        if (raw) {
          const clean = String(raw).replace(/\D/g, "");
          return clean.startsWith("+") ? clean : "+" + clean;
        }
      }
    } catch (_) {}

    // Try signalRepository lidToJid
    try {
      if (sock?.signalRepository?.lidToJid) {
        const jid = await sock.signalRepository.lidToJid(remoteJid);
        if (jid && jid.endsWith("@s.whatsapp.net")) {
          const clean = jid.split("@")[0].split(":")[0];
          return clean.startsWith("+") ? clean : "+" + clean;
        }
      }
    } catch (_) {}

    // Check all files in session directory for any matching lid mapping
    try {
      if (fs.existsSync(sessionPath)) {
        const files = fs.readdirSync(sessionPath);
        for (const file of files) {
          if (file.startsWith(`lid-mapping-${lid}`) && file.endsWith("_reverse.json")) {
            const raw = JSON.parse(fs.readFileSync(path.join(sessionPath, file), "utf8"));
            if (raw) {
              const clean = String(raw).replace(/\D/g, "");
              return clean.startsWith("+") ? clean : "+" + clean;
            }
          }
        }
      }
    } catch (_) {}

    return "+" + lid;
  }

  const raw = remoteJid.split("@")[0].split(":")[0];
  return raw.startsWith("+") ? raw : "+" + raw;
}

async function forwardMessageToCrm({ tenantId, secretKey, from, name, message, waMessageId, isOutbound = false, timestamp = null }) {
  return new Promise((resolve) => {
    try {
      const webhookUrl = `${CRM_WEBHOOK_BASE}/api/webhooks/whatsapp${secretKey ? `?sourceKey=${secretKey}` : ""}`;
      const payload = JSON.stringify({ tenantId, from, name, message, secretKey, waMessageId, isOutbound, timestamp });

      const req = http.request(
        webhookUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            console.log(`[WhatsApp Gateway] Forwarded to CRM for Tenant ${tenantId}. HTTP Status: ${res.statusCode}`);
            resolve(data);
          });
        }
      );

      req.on("error", (err) => {
        console.error("[WhatsApp Gateway] Webhook forward error:", err.message);
        resolve(null);
      });
      req.write(payload);
      req.end();
    } catch (err) {
      console.error("[WhatsApp Gateway] Forward error:", err);
      resolve(null);
    }
  });
}

async function notifyCrmLink(tenantId, phone) {
  // Silent link notification - does not insert dummy leads
  console.log(`🔗 [WhatsApp Gateway] Linked hotline ${phone} confirmed for tenant ${tenantId}`);
}

// HTTP API Server
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const tenantId = String(parsedUrl.query.tenantId || "default_tenant").trim();
  const secretKey = parsedUrl.query.secretKey ? String(parsedUrl.query.secretKey).trim() : null;

  // 1. GET /status -> returns session status, live QR image, and connected phone
  if (pathname === "/status" && req.method === "GET") {
    let session = sessions[tenantId];

    // If session doesn't exist, initialize it safely without interrupting active backoff timers
    if (!session) {
      session = await initBaileysSession(tenantId, secretKey);
    } else if (session.status === "DISCONNECTED" && !reconnectTimers[tenantId] && !connectingPromises[tenantId]) {
      session = await initBaileysSession(tenantId, secretKey);
    }

    const cur = sessions[tenantId] || session || { status: "DISCONNECTED", phone: null, qrDataUrl: null };

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({
        tenantId,
        status: cur.status,
        isConnected: cur.status === "CONNECTED",
        phone: cur.phone,
        qr: cur.qrDataUrl,
      })
    );
  }

  // 2. POST /connect -> explicitly request new QR generation
  if (pathname === "/connect" && req.method === "POST") {
    const session = await initBaileysSession(tenantId, secretKey);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({
        success: true,
        status: session.status,
        isConnected: session.status === "CONNECTED",
        phone: session.phone,
        qr: session.qrDataUrl,
      })
    );
  }

  // 3. POST /disconnect -> disconnect session & clear storage
  if (pathname === "/disconnect" && req.method === "POST") {
    if (sessions[tenantId]?.sock) {
      try {
        await sessions[tenantId].sock.logout();
      } catch (_) {}
    }
    const sessionPath = path.join(SESSIONS_DIR, tenantId);
    try {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    } catch (_) {}

    sessions[tenantId] = {
      status: "DISCONNECTED",
      qrDataUrl: null,
      phone: null,
      sock: null,
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, message: "Disconnected" }));
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Endpoint not found" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n======================================================`);
  console.log(`🚀 AceOne Baileys WhatsApp Gateway running on 127.0.0.1:${PORT}`);
  console.log(`======================================================\n`);
});

// Export gateway server for unified production runner
module.exports = {
  server,
  sessions,
  initBaileysSession,
};
