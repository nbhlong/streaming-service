import { asClass, asValue, AwilixContainer, createContainer, InjectionMode } from "awilix";
import { SSEService } from "./services/sse-service";
import { AppContainer } from "./types";
import { AuthenticateService } from "./services/authenticate-service";
import { ScheduleService } from "./services/schedule-service";
import { AuthController } from "./controllers/auth-controller";
import { SSEController } from "./controllers/sse-controller";
import { HealthController } from "./controllers/health-controller";
import { logger } from "sc-common";
import { VideoService } from "./services/video-service";

export class ContainerRegistry {
  container: AwilixContainer<AppContainer>;

  constructor() {
    this.container = createContainer<AppContainer>({
      injectionMode: InjectionMode.PROXY,
    });
  }

  register() {
    this.container.register({
      sseService: asClass(SSEService).singleton(),
      authenticateService: asClass(AuthenticateService).singleton(),
      scheduleService: asClass(ScheduleService).singleton(),
      logService: asValue(logger),
      videoService: asClass(VideoService).singleton(),
    });

    this.container.register({
      authController: asClass(AuthController).transient(),
      sseController: asClass(SSEController).transient(),
      healthController: asClass(HealthController).transient(),
    });

    return this.container;
  }
}
