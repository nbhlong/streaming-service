import { Request, Response } from "express";
import mongoose from "mongoose";
import { AppContainer } from "../types";
import { VideoService } from "../services/video-service";

export class HealthController {
  private readonly videoService: VideoService;

  constructor(container: AppContainer) {
    this.videoService = container.videoService;
  }

  public async healthCheck(req: Request, res: Response): Promise<void> {
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    const isHealthy = dbStatus === "connected";

    // Get broadcast scheduler statistics
    const broadcastStats = this.videoService.getBroadcastData();

    res.status(isHealthy ? 200 : 500).json({
      status: isHealthy ? "ok" : "error",
      message: "Streaming service running",
      database: dbStatus,
      broadcasts: {
        total: broadcastStats.totalJobs,
        byType: broadcastStats.jobsByType,
        byProduct: broadcastStats.jobsByProduct,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
