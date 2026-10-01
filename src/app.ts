import Fastify from "fastify";
import { pool } from "./config/database.js";

import { AlertRepository } from "./repositories/alert.repository.js";
import { AlertService } from "./services/alert.service.js";
import { alertRoutes } from "./routes/alert.routes.js";

import { MatchingRepository } from "./repositories/matching.repository.js";
import { MatchingService } from "./services/matching.service.js";
import { productRoutes } from "./routes/product.routes.js";

import { NotificationRepository } from "./repositories/notification.repository.js";
import { NotificationService } from "./services/notification.service.js";

export function buildApp() {
  const app = Fastify({
    logger: true
  });

  const alertRepository =
    new AlertRepository(pool);

  const alertService =
    new AlertService(alertRepository);

  const matchingRepository =
    new MatchingRepository(pool);

  const notificationRepository =
  new NotificationRepository(pool);

  const notificationService =
  new NotificationService(notificationRepository);

  const matchingService =
    new MatchingService(
      matchingRepository,
      notificationService
    );

  app.get("/health", async () => {
    return {
      status: "ok"
    };
  });

  app.get("/db-health", async () => {
    const result = await pool.query(
      "SELECT NOW()"
    );

    return {
      status: "ok",
      database: "connected",
      time: result.rows[0].now
    };
  });

  app.register(async (instance) => {
    await alertRoutes(
      instance,
      alertService
    );
  });

  app.register(async (instance) => {
    await productRoutes(
      instance,
      matchingService
    );
  });

  return app;
}