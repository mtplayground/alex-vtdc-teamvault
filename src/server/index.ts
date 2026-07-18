import { config } from "./config";
import { createApp } from "./app";

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`API server listening on port ${config.port}`);
});

function shutdown(signal: NodeJS.Signals) {
  console.log(`${signal} received; closing API server.`);
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
