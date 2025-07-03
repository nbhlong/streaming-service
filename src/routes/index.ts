import { Router } from "express";
import { verifyJWT } from "../middlewares/verify-jwt";
import { AppContainer } from "../types";
import { AwilixContainer } from "awilix";

export function setupRoutes(container: AwilixContainer<AppContainer>): Router {
  const router = Router();
  const sseController = container.resolve("sseController");
  const healthController = container.resolve("healthController");
  const authController = container.resolve("authController");

  router.get("/", healthController.healthCheck);

  router.post("/api/token", authController.login);

  router.get("/sse", (req, res) => sseController.handleSSEConnection(req, res));

  return router;
}
