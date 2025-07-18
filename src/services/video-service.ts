import { logger } from "sc-common";
import { AppContainer, EventDetail } from "../types";
import { ScheduleService } from "./schedule-service";
import cron from "cron";
import { SSEService } from "./sse-service";
import { StreamingData } from "./streaming-data";
import { BroadcastScheduler } from "./broadcast-scheduler";
import { extractRoundId } from "../helpers/id-helper";

const scheduleDelay = 10 * 1000;

export class VideoService {
  private readonly scheduleService: ScheduleService;
  private readonly logService: typeof logger;
  private readonly sseService: SSEService;
  private readonly streamingData: StreamingData;
  private readonly broadcastScheduler: BroadcastScheduler;

  constructor(container: AppContainer) {
    this.scheduleService = container.scheduleService;
    this.logService = container.logService;
    this.sseService = container.sseService;
    this.streamingData = container.streamingData;
    this.broadcastScheduler = container.broadcastScheduler;
  }

  async start() {
    const currentEventIDs = await this.getCurrentEventIDsOfAllProducts();

    currentEventIDs.forEach((eventID) => {
      this.firstUpdateCurrentEvent(eventID);
    });

    this.startCron();
  }

  startCron() {
    const job = new cron.CronJob(
      "*/10 * * * * *",
      () => this.schedule().catch(this.logService.logError),
      () => {
        this.logService.logError("Cron job unexpectedly stopped because some other tasks halt it.");
        job.start();
      }
    );

    job.start();
  }

  async schedule() {
    const nextEventIDs = await this.getNextEventIDsForEachProduct();

    this.handleScheduleEvents(Object.values(nextEventIDs));
  }

  handleScheduleEvents(eventIDs: number[]) {
    eventIDs.forEach((eventID) => {
      this.handleScheduleEvent(eventID);
    });
  }

  async firstUpdateCurrentEvent(eventID: number) {
    const updateEvent = await this.scheduleService.getEventDetailsWithRetry(eventID);

    if (!updateEvent) {
      this.logService.logError(`Event ${eventID} not found`);
      console.error(`Event ${eventID} not found`);
      return;
    }

    const productCode = updateEvent.productCode;
    let currentEventDetailIndex = 0;
    this.streamingData.currentEvents[productCode] = updateEvent;

    updateEvent.eventDetails.forEach((eventDetail, index) => {
      this.handleOddsAvailableForEventDetail(eventDetail, index, productCode);
      this.handleVideoInfoAvailableForEventDetail(eventDetail, index, productCode);
      this.handleResultAvailableForEventDetail(eventDetail, index, productCode);

      if (Date.now() > new Date(eventDetail.resultsAvailableTs).getTime()) {
        currentEventDetailIndex++;
      }
    });

    this.streamingData.currentEvents[productCode].currentEventDetailIndex = Math.min(
      currentEventDetailIndex,
      updateEvent.eventDetails.length - 1
    );
  }

  async handleScheduleEvent(eventID: number) {
    const updateEvent = await this.scheduleService.getEventDetailsWithRetry(eventID);

    if (!updateEvent) {
      this.logService.logError(`Event ${eventID} not found`);
      console.error(`Event ${eventID} not found`);
      return;
    }

    const scheduledTime = new Date(new Date(updateEvent.scheduleStartTs).getTime() + scheduleDelay);
    const productCode = updateEvent.productCode;
    const jobId = this.generateJobId(productCode, eventID, 0, "schedule");

    this.broadcastScheduler.scheduleJob(jobId, scheduledTime, async () => {
      this.streamingData.currentEvents[productCode] = updateEvent;
      this.streamingData.currentEvents[productCode].currentEventDetailIndex = 0;

      updateEvent.eventDetails.forEach((eventDetail, index) => {
        const event = { ...eventDetail };

        this.handleOddsAvailableForEventDetail(event, index, productCode);
        this.handleVideoInfoAvailableForEventDetail(event, index, productCode);
        this.handleResultAvailableForEventDetail(event, index, productCode);
      });

      this.sseService.broadcastVideo(productCode, updateEvent, "schedule event");
    });
  }

  async handleOddsAvailableForEventDetail(eventDetail: EventDetail, index: number, productCode: string) {
    const scheduledTime = new Date(eventDetail.oddsAvailableTs);
    const jobId = this.generateJobId(productCode, eventDetail.eventID, index, "odds");

    this.broadcastScheduler.scheduleJob(jobId, scheduledTime, async () => {
      const updateEvent = await this.scheduleService.getEventDetailsWithRetry(eventDetail.eventID);

      if (!updateEvent) {
        return;
      }

      updateEvent.currentEventDetailIndex = index;
      this.streamingData.currentEvents[productCode] = updateEvent;

      this.sseService.broadcastVideo(productCode, updateEvent, "odds available");
    });
  }

  async handleVideoInfoAvailableForEventDetail(eventDetail: EventDetail, index: number, productCode: string) {
    const scheduledTime = new Date(eventDetail.scheduleStartTs);
    const jobId = this.generateJobId(productCode, eventDetail.eventID, index, "video");

    this.broadcastScheduler.scheduleJob(jobId, scheduledTime, async () => {
      const updateEvent = await this.scheduleService.getEventDetailsWithRetry(eventDetail.eventID);

      if (!updateEvent) {
        return;
      }

      updateEvent.currentEventDetailIndex = index;
      this.streamingData.currentEvents[productCode] = updateEvent;

      this.sseService.broadcastVideo(productCode, updateEvent, "video info available");
    });
  }

  async handleResultAvailableForEventDetail(eventDetail: EventDetail, index: number, productCode: string) {
    const scheduledTime = new Date(eventDetail.resultsAvailableTs);
    const jobId = this.generateJobId(productCode, eventDetail.eventID, index, "result");

    this.broadcastScheduler.scheduleJob(jobId, scheduledTime, async () => {
      const updateEvent = await this.scheduleService.getEventDetailsWithRetry(eventDetail.eventID);

      if (!updateEvent) {
        return;
      }

      this.streamingData.currentEvents[productCode] = updateEvent;
      this.streamingData.currentEvents[productCode].currentEventDetailIndex = Math.min(
        index + 1,
        updateEvent.eventDetails.length - 1
      );

      this.sseService.broadcastVideo(productCode, { ...updateEvent, currentEventDetailIndex: index }, "result available");
    });
  }

  async getUpcomingEventIDs() {
    const upcomingEvents = await this.scheduleService.getScheduleWithRetry();
    return upcomingEvents.map((event) => event.eventID);
  }

  async getNextEventIDsForEachProduct() {
    const allUpComingEvents = await this.scheduleService.getScheduleWithRetry();

    const nextEvents = allUpComingEvents.reduce((events: Record<string, number>, event) => {
      const code = event.productCode;
      if (!events[code] || event.eventID < events[code]) {
        events[code] = event.eventID;
      }
      return events;
    }, {});

    return nextEvents;
  }

  async getCurrentEventIDsOfAllProducts(): Promise<number[]> {
    const nextEventIDs = await this.getNextEventIDsForEachProduct();

    const currentEventIDs = Object.values(nextEventIDs).map((eventID) => {
      const roundId = extractRoundId(eventID);
      return roundId > 1 ? eventID - 1 : eventID;
    });

    return currentEventIDs;
  }

  cleanup() {
    this.broadcastScheduler.stopAll();
  }

  private generateJobId(productCode: string, eventId: number, index: number, jobType: string) {
    return `${productCode}_${eventId}_${index}_${jobType}`;
  }
}
