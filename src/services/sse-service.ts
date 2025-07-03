import { Response } from "express";
import dayjs from "dayjs";

export type SSEClient = { res: Response };

export interface Video {
  url: string;
  length: number;
  startTime: Date;
}

export interface VideoPayload {
  videoUrl: string;
  videoStartTime: string;
  videoPlayingTime: number;
  videoLength: number;
  message?: string;
}

export class SSEService {
  private clients: SSEClient[] = [];
  private currentVideo: Video | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.startVideoGeneration();
  }

  private startVideoGeneration(): void {
    const generateVideo = (): void => {
      const video: Video = {
        url: "https://cdn.example.com/v/vid001.m3u8",
        length: 30,
        startTime: new Date(),
      };

      this.currentVideo = video;
      this.broadcastVideo(video);
    };

    generateVideo();
    this.intervalId = setInterval(generateVideo, 60 * 1000);
  }

  private broadcastVideo(video: Video): void {
    const payload: VideoPayload = {
      videoUrl: video.url,
      videoStartTime: video.startTime.toISOString(),
      videoPlayingTime: 0,
      videoLength: video.length,
    };

    const data = `data: ${JSON.stringify(payload)}\n\n`;
    this.clients.forEach((client) => client.res.write(data));
    console.log(`📢 Sent video to ${this.clients.length} client(s)`);
  }

  public addClient(res: Response): void {
    this.clients.push({ res });

    // Send current video immediately if available
    if (this.currentVideo) {
      const now = dayjs();
      const secondsPassed = now.diff(this.currentVideo.startTime, "second");

      const payload: VideoPayload = {
        message: "Broadcasted video on first connection",
        videoUrl: this.currentVideo.url,
        videoStartTime: this.currentVideo.startTime.toISOString(),
        videoLength: this.currentVideo.length,
        videoPlayingTime: secondsPassed,
      };

      console.log("Broadcasted video on first connection");
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  }

  public removeClient(res: Response): void {
    this.clients = this.clients.filter((client) => client.res !== res);
  }

  public getClientCount(): number {
    return this.clients.length;
  }

  public cleanup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
