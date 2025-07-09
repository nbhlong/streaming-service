import { logger } from "sc-common";
import { AppContainer } from "../types";
import { ScheduleService } from "./schedule-service";
import cron from "cron";
import { SSEService } from "./sse-service";

export class VideoService {
  private readonly scheduleService: ScheduleService;
  private readonly logService: typeof logger;
  private readonly sseService: SSEService;

  private nextEvents: Record<string, any> = {};
  private currentEvents: Record<string, any> = {};

  constructor(container: AppContainer) {
    this.scheduleService = container.scheduleService;
    this.logService = container.logService;
    this.sseService = container.sseService;
  }

  async start() {
    this.nextEvents = await this.getNextEventsForEachProduct();
    this.currentEvents = await this.getCurrentEvents();

    Object.keys(this.currentEvents).forEach((productCode) => {
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
    this.nextEvents = await this.getNextEventsForEachProduct();
    Object.keys(this.nextEvents).forEach((productCode) => {
      if (!this.currentEvents[productCode]) {
        this.currentEvents[productCode] = this.nextEvents[productCode];
        this.scheduleCurrentEvents(productCode);
      }
    });
  }

  async scheduleCurrentEvents(productCode: string) {
    console.log("scheduleCurrentEvents", productCode);
    const event = this.currentEvents[productCode];
    const updateEvent = await this.scheduleService.getEventDetailsWithRetry(event.eventID);
    updateEvent.eventDetails.forEach((eventDetail: any, index: number) => {
      this.handleOddsAvailableForEventDetail(eventDetail, index, productCode);
      this.handleVideoInfoAvailableForEventDetail(eventDetail, index, productCode);
      this.handleResultAvailableForEventDetail(eventDetail, index, productCode);
    });
  }

  handleOddsAvailableForEventDetail(eventDetail: any, index: number, productCode: string) {
    const delay = new Date(eventDetail.oddsAvailableTs).getTime() - new Date().getTime();

    setTimeout(async () => {
      const updateEvent = await this.scheduleService.getEventDetailsWithRetry(eventDetail.eventID);
      this.sseService.broadcastVideo(productCode, updateEvent.eventDetails[index], "odds available");
    }, delay);
  }

  handleVideoInfoAvailableForEventDetail(eventDetail: any, index: number, productCode: string) {
    const delay = new Date(eventDetail.scheduleStartTs).getTime() - new Date().getTime();

    setTimeout(async () => {
      const updateEvent = await this.scheduleService.getEventDetailsWithRetry(eventDetail.eventID);
      this.sseService.broadcastVideo(productCode, updateEvent.eventDetails[index], "video info available");
    }, delay);
  }

  handleResultAvailableForEventDetail(eventDetail: any, index: number, productCode: string) {
    const delay = new Date(eventDetail.resultsAvailableTs).getTime() - new Date().getTime();

    setTimeout(async () => {
      const updateEvent = await this.scheduleService.getEventDetailsWithRetry(eventDetail.eventID);
      this.sseService.broadcastVideo(productCode, updateEvent.eventDetails[index], "result available");

      if (
        index === updateEvent.eventDetails.length - 1 &&
        this.currentEvents[productCode].eventID < this.nextEvents[productCode].eventID
      ) {
        this.currentEvents[productCode] = this.nextEvents[productCode];
        console.log("schedule next event");
        this.scheduleCurrentEvents(productCode);
      }
    }, delay);
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
}
