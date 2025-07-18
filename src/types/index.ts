import { AuthController } from "../controllers/auth-controller";
import { HealthController } from "../controllers/health-controller";
import { SSEController } from "../controllers/sse-controller";
import { AuthenticateService } from "../services/authenticate-service";
import { ScheduleService } from "../services/schedule-service";
import { SSEService } from "../services/sse-service";
import { logger } from "sc-common";
import { VideoService } from "../services/video-service";
import { StreamingData } from "../services/streaming-data";
import { BroadcastScheduler } from "../services/broadcast-scheduler";

export interface AppContainer {
  sseService: SSEService;
  authenticateService: AuthenticateService;
  scheduleService: ScheduleService;
  logService: typeof logger;
  authController: AuthController;
  sseController: SSEController;
  healthController: HealthController;
  videoService: VideoService;
  streamingData: StreamingData;
  broadcastScheduler: BroadcastScheduler;
}

export type Event = {
  eventID: number;
  eventNameAKey: string;
  eventNameBKey: string;
  theme?: string;
  scheduleStartTs: string;
  productCode: string;
  productTypeKey: string;
  eventDetails: EventDetail[];
  currentEventDetailIndex: number;
};

export type EventDetail = {
  eventID: number;
  oddsAvailableTs: string;
  scheduleStartTs: string;
  resultsAvailableTs: string;
  hasResults: boolean;
  goalInfo: string;
  playlist: string;
  result: any;
  selections: any;
};
