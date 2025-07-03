import { logger } from "sc-common";
import mongoose from "mongoose";
import { appConfigs } from "./app-configs";

type AppConfig = typeof appConfigs;

export class Configuration {
  async configureDatabaseAndSentry(configs: AppConfig) {
    logger.start(configs.sentry as any);
    await this.configureDatabase(configs.database);
  }

  private async configureDatabase({ url = "", options = {} }) {
    try {
      await mongoose.connect(url, options);

      this.setupMongoEventHandlers();
      logger.log("MongoDB database connection established successfully");
    } catch (error) {
      logger.logError(`Failed to connect to MongoDB: ${error}`);
    }
  }

  private setupMongoEventHandlers() {
    mongoose.connection.on("connected", () => {
      logger.log(`MongoDB connected at ${new Date()}`);
    });

    mongoose.connection.on("reconnected", () => {
      logger.logWarning(`MongoDB reconnected at ${new Date()}`);
    });

    mongoose.connection.on("disconnected", () => {
      logger.logWarning(`MongoDB disconnected at ${new Date()}`);
    });

    mongoose.connection.on("error", (err) => {
      logger.logError(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on("close", () => {
      logger.logWarning("MongoDB connection pool closed");
    });
  }
}
