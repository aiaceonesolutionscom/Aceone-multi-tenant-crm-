const { createServer } = require("http");
const { parse } = require("url");
const path = require("path");
const { spawn } = require("child_process");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const rawPort = process.env.PORT;
const port = rawPort && isNaN(Number(rawPort)) ? rawPort : (parseInt(rawPort, 10) || 3000);

const app = next({ dev, hostname, port: typeof port === "number" ? port : 3000 });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  server.listen(port, () => {
    console.log(`> Closify CRM ready on ${typeof port === "number" ? `http://${hostname}:${port}` : `socket ${port}`}`);

    // Auto-boot WhatsApp Baileys Gateway in background daemon process (isolated from Passenger HTTP listener)
    try {
      console.log("⚡ [Single-Domain Supervisor] Spawning internal WhatsApp Baileys Gateway daemon...");
      const gw = spawn(process.execPath, [path.join(__dirname, "whatsapp-server.js")], {
        stdio: "inherit",
        env: { ...process.env, PORT: "3001" },
      });
      gw.on("error", (gwErr) => {
        console.error("⚠️ [Single-Domain Supervisor] WhatsApp Gateway error:", gwErr.message);
      });
    } catch (spawnErr) {
      console.error("⚠️ [Single-Domain Supervisor] Failed to spawn WhatsApp Gateway:", spawnErr.message);
    }
  });
});
