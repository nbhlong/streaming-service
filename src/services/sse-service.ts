import { Response } from "express";
import dayjs from "dayjs";
import { AppContainer, Event } from "../types";
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
  result: any;
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

  broadcastVideo(productCode: string, event: Event, message: string): void {
    const currentEvent = event.eventDetails[event.currentEventDetailIndex];
    const clientsForProduct = this.clients.filter((client) => client.gameId === productCode);
    console.log(
      `Sent video to ${clientsForProduct.length} client(s) for product: ${productCode} with eventID: ${currentEvent.eventID} index: ${event.currentEventDetailIndex} and message: ${message}`
    );

    clientsForProduct.forEach((client) => {
      const payload: VideoPayload = {
        eventId: currentEvent.eventID,
        eventDetailIndex: event.currentEventDetailIndex,
        videoUrl: currentEvent.playlist,
        videoStartTime: currentEvent.scheduleStartTs,
        videoPlayingTime: 0,
        videoLength: 0,
        message: message,
        result: currentEvent.result,
      };

      client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    });
  }

  public async addClient(res: Response, gameId: string): Promise<void> {
    this.clients.push({ res, gameId });

    const currentEvent = this.streamingData.currentEvents[gameId];
    const currentEventDetail = currentEvent.eventDetails[currentEvent.currentEventDetailIndex];

    if (currentEventDetail) {
      const now = dayjs();
      const secondsPassed = now.diff(currentEventDetail.scheduleStartTs, "second");

      const payload: VideoPayload = {
        message: "Broadcasted video on first connection",
        eventId: currentEventDetail.eventID,
        eventDetailIndex: currentEvent.currentEventDetailIndex,
        videoUrl: currentEventDetail.playlist,
        videoStartTime: currentEventDetail.scheduleStartTs,
        videoLength: 0,
        videoPlayingTime: secondsPassed,
        gameId: gameId,
        result: currentEventDetail.result,
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
