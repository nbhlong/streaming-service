import { logger } from "sc-common";
import { AppContainer } from "../types";
import { ScheduleService } from "./schedule-service";
import cron from "cron";
import { SSEService } from "./sse-service";
import { StreamingData } from "./streaming-data";
import { BroadcastScheduler } from "./broadcast-scheduler";

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
    this.streamingData.nextEvents = await this.getNextEventsForEachProduct();
    this.streamingData.currentEvents = await this.getCurrentEvents();

    Object.keys(this.streamingData.currentEvents).forEach((productCode) => {
      this.scheduleCurrentEvents(productCode);
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
    this.streamingData.nextEvents = await this.getNextEventsForEachProduct();
    Object.keys(this.streamingData.nextEvents).forEach((productCode) => {
      if (!this.streamingData.currentEvents[productCode]) {
        this.streamingData.currentEvents[productCode] = this.streamingData.nextEvents[productCode];
        this.scheduleCurrentEvents(productCode);
      }
    });
  }

  async scheduleCurrentEvents(productCode: string) {
    const event = this.streamingData.currentEvents[productCode];
    const updateEvent = await this.scheduleService.getEventDetailsWithRetry(event.eventID);
    this.streamingData.currentEvents[productCode] = updateEvent;

    let currentIndex = 0;
    updateEvent.eventDetails.forEach((eventDetail: any, index: number) => {
      this.handleOddsAvailableForEventDetail(eventDetail, index, productCode);
      this.handleVideoInfoAvailableForEventDetail(eventDetail, index, productCode);
      this.handleResultAvailableForEventDetail(eventDetail, index, productCode);
      if (Date.now() > new Date(eventDetail.resultsAvailableTs).getTime()) {
        currentIndex++;
      }
    });

    this.streamingData.currentEvents[productCode].index = currentIndex;
  }

  handleOddsAvailableForEventDetail(eventDetail: any, index: number, productCode: string) {
    const scheduledTime = new Date(eventDetail.oddsAvailableTs);
    const jobId = this.generateJobId(productCode, this.streamingData.currentEvents[productCode].eventID, index, "odds");

    this.broadcastScheduler.scheduleJob(jobId, scheduledTime, async () => {
      const updateEvent = await this.scheduleService.getEventDetailsWithRetry(
        this.streamingData.currentEvents[productCode].eventID
      );
      this.streamingData.currentEvents[productCode] = updateEvent;

      this.sseService.broadcastVideo(productCode, updateEvent.eventDetails[index], "odds available", index);
    });
  }

  handleVideoInfoAvailableForEventDetail(eventDetail: any, index: number, productCode: string) {
    const scheduledTime = new Date(eventDetail.scheduleStartTs);
    const jobId = this.generateJobId(productCode, this.streamingData.currentEvents[productCode].eventID, index, "video");

    this.broadcastScheduler.scheduleJob(jobId, scheduledTime, async () => {
      const updateEvent = await this.scheduleService.getEventDetailsWithRetry(
        this.streamingData.currentEvents[productCode].eventID
      );
      this.streamingData.currentEvents[productCode] = updateEvent;
      this.streamingData.currentEvents[productCode].index = index;

      this.sseService.broadcastVideo(productCode, updateEvent.eventDetails[index], "video info available", index);
    });
  }

  handleResultAvailableForEventDetail(eventDetail: any, index: number, productCode: string) {
    const scheduledTime = new Date(eventDetail.resultsAvailableTs);
    const jobId = this.generateJobId(productCode, this.streamingData.currentEvents[productCode].eventID, index, "result");

    this.broadcastScheduler.scheduleJob(jobId, scheduledTime, async () => {
      const updateEvent = await this.scheduleService.getEventDetailsWithRetry(
        this.streamingData.currentEvents[productCode].eventID
      );
      this.streamingData.currentEvents[productCode] = updateEvent;

      this.sseService.broadcastVideo(productCode, updateEvent.eventDetails[index], "result available", index);

      if (
        index === updateEvent.eventDetails.length - 1 &&
        this.streamingData.currentEvents[productCode].eventID < this.streamingData.nextEvents[productCode].eventID
      ) {
        this.streamingData.currentEvents[productCode] = this.streamingData.nextEvents[productCode];
        this.scheduleCurrentEvents(productCode);
      }
    });
  }

  async getNextEventsForEachProduct() {
    const allUpComingEvents = await this.scheduleService.getScheduleWithRetry();

    const nextEvents = allUpComingEvents.reduce((events: any, event: any) => {
      const code = event.productCode;
      if (!events[code] || event.eventID < events[code].eventID) {
        events[code] = event;
      }
      return events;
    }, {});

    return nextEvents;
  }

  async getCurrentEvents() {
    const events = await this.getNextEventsForEachProduct();

    Object.keys(events).forEach((productCode) => {
      events[productCode].eventID = events[productCode].eventID - 1;
    });

    return events;
  }

  getBroadcastData() {
    return this.streamingData.currentEvents.map((event: any) => {
      return {
        productCode: event.productCode,
        eventID: event.eventID,
        index: event.index,
      };
    });
  }

  cleanup() {
    this.broadcastScheduler.stopAll();
  }

  private generateJobId(productCode: string, eventId: number, index: number, jobType: string) {
    return `${productCode}_${eventId}_${index}_${jobType}`;
  }
}
