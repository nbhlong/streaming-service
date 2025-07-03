import { appConfigs } from "../app-configs";

export class ScheduleService {
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
    return data.access_token;
  }

  async getSchedule() {
    const token = await this.getOddsFeedToken();
    const response = await fetch(`${appConfigs.oddsFeedAPI.url}/api/schedule`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return data;
  }
}
