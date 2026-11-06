const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

// Auto-boot WhatsApp Baileys Gateway in unified single-domain production process
try {
  console.log("⚡ [Single-Domain Supervisor] Launching internal WhatsApp Baileys Gateway daemon...");
  require("./whatsapp-server.js");
} catch (gwErr) {
  console.error("⚠️ [Single-Domain Supervisor] Failed to boot internal WhatsApp Gateway:", gwErr.message);
}

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const rawPort = process.env.PORT;
const port = rawPort && isNaN(Number(rawPort)) ? rawPort : (parseInt(rawPort, 10) || 3000);

const app = next({ dev, hostname, port: typeof port === "number" ? port : 3000 });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  }).listen(port, () => {
    console.log(`> Closify CRM ready on ${typeof port === "number" ? `http://${hostname}:${port}` : `socket ${port}`}`);
  });
});
