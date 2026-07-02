import app from "./app.js";
import { logger } from "./lib/logger.js";
import { createBot } from "./bot/index.js";
import { loadConfig } from "./bot/config.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});

// Uruchom bota Discord
const token = process.env.DISCORD_BOT_TOKEN;
if (token) {
  loadConfig();
  const client = createBot();
  client.login(token).catch((err) => {
    logger.error({ err }, "Nie udało się zalogować bota Discord");
  });
} else {
  logger.warn("DISCORD_BOT_TOKEN nie jest ustawiony — bot Discord nie zostanie uruchomiony");
}
