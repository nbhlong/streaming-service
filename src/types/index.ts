import { AuthController } from "../controllers/auth-controller";
import { HealthController } from "../controllers/health-controller";
import { SSEController } from "../controllers/sse-controller";
import { AuthenticateService } from "../services/authenticate-service";
import { ScheduleService } from "../services/schedule-service";
import { SSEService } from "../services/sse-service";

export interface AppContainer {
  sseService: SSEService;
  authenticateService: AuthenticateService;
  scheduleService: ScheduleService;

  authController: AuthController;
  sseController: SSEController;
  healthController: HealthController;
}
