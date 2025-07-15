import { Response } from "express";
import dayjs from "dayjs";
import { ScheduleService } from "./schedule-service";
import { AppContainer } from "../types";
import { StreamingData } from "./streaming-data";

export type SSEClient = { res: Response; gameId: string };

export interface Video {
  url: string;
  length: number;
  startTime: Date;
  gameId: string;
}

export interface VideoPayload {
  eventId: number;
  eventDetailIndex: number;
  videoUrl: string;
  videoStartTime: string;
  videoPlayingTime: number;
  videoLength: number;
  message?: string;
  gameId?: string;
}

export class SSEService {
  private clients: SSEClient[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private readonly streamingData: StreamingData;

  constructor(container: AppContainer) {
    this.streamingData = container.streamingData;
  }

  broadcastVideo(productCode: string, currentEvent: any, message: string, index: number): void {
    const clientsForProduct = this.clients.filter((client) => client.gameId === productCode);
    console.log(
      `Sent video to ${clientsForProduct.length} client(s) for product: ${productCode} with eventID: ${currentEvent.eventID} index: ${index} and message: ${message}`
    );

    clientsForProduct.forEach((client) => {
      const payload: any = {
        eventId: currentEvent.eventID,
        eventDetailIndex: index,
        videoUrl: currentEvent.playlist,
        videoStartTime: currentEvent.scheduleStartTs,
        videoPlayingTime: 0,
        message: message,
      };

      client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    });
  }

  public async addClient(res: Response, gameId: string): Promise<void> {
    this.clients.push({ res, gameId });
    const currentEvent = this.streamingData.currentEvents[gameId];
    const currentEventDetail = currentEvent.eventDetails[currentEvent.index];

    if (currentEventDetail) {
      const now = dayjs();
      const secondsPassed = now.diff(currentEventDetail.scheduleStartTs, "second");

      const payload: VideoPayload = {
        message: "Broadcasted video on first connection",
        eventId: currentEventDetail.eventID,
        eventDetailIndex: currentEvent.index,
        videoUrl: currentEventDetail.playlist,
        videoStartTime: currentEventDetail.scheduleStartTs,
        videoLength: currentEventDetail.scheduleDuration,
        videoPlayingTime: secondsPassed,
        gameId: gameId,
      };

      console.log(`Broadcasted video on first connection for game ${gameId}`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }

    if (!currentEvent) {
      res.write(`data: ${JSON.stringify({ message: "No video found for game" })}\n\n`);
      res.end();
    }
  }

  public removeClient(res: Response): void {
    this.clients = this.clients.filter((client) => client.res !== res);
  }

  public getClientCount(): number {
    return this.clients.length;
  }

  public getClientCountForGame(gameId: string): number {
    return this.clients.filter((client) => client.gameId === gameId).length;
  }

  public cleanup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
