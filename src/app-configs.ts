export const appConfigs = {
  hostingPort: 5000,
  database: {
    url: "mongodb://localhost:27017",
    options: {
      dbName: "marble-football",
    },
  },
  sentry: {
    sentryUrl: "https://6b0f71afab190ba976d8bdc7a43969fe@sentry-k8s.lumigame.com/15",
    logIdentifier: "Streaming-Service",
    env: "DEV",
  },
  jwt: {
    secret: "stream-service-secret",
  },
  oddsFeedAPI: {
    url: "https://mg-odds-feed-local.lumigame.com",
    operatorId: "67d291d943a96fad7f14ddae",
    password: "Nkb3rnoLMEhxUBB8Qahfn",
  },
};
