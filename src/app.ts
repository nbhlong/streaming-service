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

  app.listen(appConfigs.hostingPort, () => {
    console.log(`SSE server running at http://localhost:${appConfigs.hostingPort}`);
  });
};

run().catch((error) => {
  console.error("App running error:", error);
  process.exit(1);
});
