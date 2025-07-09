import { appConfigs } from "../app-configs";
import { retry } from "../helpers/retry";

export class ScheduleService {
  private token = "";

  async getOddsFeedToken() {
    const response = await fetch(`${appConfigs.oddsFeedAPI.url}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operatorId: appConfigs.oddsFeedAPI.operatorId,
        password: appConfigs.oddsFeedAPI.password,
      }),
    });

    const data = await response.json();
    this.token = data.access_token;
    return this.token;
  }

  private async getSchedule() {
    const token = this.token || (await this.getOddsFeedToken());
    const response = await fetch(`${appConfigs.oddsFeedAPI.url}/api/schedule`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status !== 200) {
      throw new Error(`Failed to get schedule: ${response.status}`);
    }

    const data = await response.json();

    return data;
  }

  async getScheduleWithRetry() {
    try {
      return await retry(() => this.getSchedule());
    } catch (error) {
      console.error("Failed to get schedule: ", error);
    }
  }

  private async getEventDetails(eventId: number) {
    const token = this.token || (await this.getOddsFeedToken());

    const response = await fetch(`${appConfigs.oddsFeedAPI.url}/api/events?eventID=${eventId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status !== 200) {
      throw new Error(`Failed to get event details: ${response.status}`);
    }

    const data = await response.json();
    return data;
  }

  async getEventDetailsWithRetry(eventId: number) {
    try {
      return await retry(() => this.getEventDetails(eventId));
    } catch (error) {
      console.error("Failed to get event details: ", error);
    }
  }
}
