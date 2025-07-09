import { Response } from "express";
import dayjs from "dayjs";
import { ScheduleService } from "./schedule-service";
import { AppContainer } from "../types";

export type SSEClient = { res: Response; gameId: string };

export interface Video {
  url: string;
  length: number;
  startTime: Date;
  gameId: string;
}

export interface VideoPayload {
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
  private readonly scheduleService: ScheduleService;

  constructor(container: AppContainer) {
    this.scheduleService = container.scheduleService;
  }

  broadcastVideo(productCode: string, currentEvent: any, message: string): void {
    const clientsForProduct = this.clients.filter((client) => client.gameId === productCode);
    console.log(
      `Sent video to ${clientsForProduct.length} client(s) for product: ${productCode} with eventID: ${currentEvent.eventID} and message: ${message}`
    );

    clientsForProduct.forEach((client) => {
      const payload: any = {
        eventId: currentEvent.eventID,
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

    // if (video) {
    //   const now = dayjs();
    //   const secondsPassed = now.diff(video.startTime, "second");

    //   const payload: VideoPayload = {
    //     message: "Broadcasted video on first connection",
    //     videoUrl: video.url,
    //     videoStartTime: video.startTime.toISOString(),
    //     videoLength: video.length,
    //     videoPlayingTime: secondsPassed,
    //     gameId: gameId,
    //   };

    //   console.log(`Broadcasted video on first connection for game ${gameId}`);
    //   res.write(`data: ${JSON.stringify(payload)}\n\n`);
    // } else {
    //   res.write(`data: ${JSON.stringify({ message: "No video found for game" })}\n\n`);
    //   res.end();
    // }
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
