import express from "express";
import { appConfigs } from "./app-configs";
import { Configuration } from "./configuration";
import { setupRoutes } from "./routes";
import { ContainerRegistry } from "./container-registry";

const run = async () => {
  const configuration = new Configuration();
  await configuration.configureDatabaseAndSentry(appConfigs);
  const container = new ContainerRegistry().register();
  const videoService = container.resolve("videoService");
  await videoService.start();
  const app = express();
  app.use(express.json());
  app.set("port", appConfigs.hostingPort);

  app.use(setupRoutes(container));

  const server = app.listen(appConfigs.hostingPort, () => {
    console.log(`SSE server running at http://localhost:${appConfigs.hostingPort}`);
  });

  // Graceful shutdown
  const gracefulShutdown = (signal: string) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);

    // Clean up broadcast jobs
    videoService.cleanup();

    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.error("Could not close connections in time, forcefully shutting down");
      process.exit(1);
    }, 10000);
  };

  // Handle shutdown signals
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
};

run().catch((error) => {
  console.error("App running error:", error);
  process.exit(1);
});
