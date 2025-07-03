import { Request, Response } from "express";
import { SSEService } from "../services/sse-service";
import { AppContainer } from "../types";

export class SSEController {
  private readonly sseService: SSEService;

  constructor(container: AppContainer) {
    this.sseService = container.sseService;
  }

  public handleSSEConnection(req: Request, res: Response): void {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    this.sseService.addClient(res);

    req.on("close", () => {
      this.sseService.removeClient(res);
    });
  }
}
