import { FastifyInstance } from "fastify";
import { z } from "zod";
import { AlertService } from "../services/alert.service.js";

const createAlertSchema = z.object({
  userId: z.number().int().positive(),

  minimumDiscountPercent: z
    .number()
    .min(0)
    .max(100),

  categories: z
    .array(z.string().min(1))
    .min(1),

  productTypes: z
    .array(z.string().min(1))
    .min(1),

  sellerTypes: z
    .array(z.string().min(1))
    .min(1),

  isActive: z.boolean().optional()
});

const updateAlertSchema = z.object({
  minimumDiscountPercent: z
    .number()
    .min(0)
    .max(100)
    .optional(),

  categories: z
    .array(z.string().min(1))
    .min(1)
    .optional(),

  productTypes: z
    .array(z.string().min(1))
    .min(1)
    .optional(),

  sellerTypes: z
    .array(z.string().min(1))
    .min(1)
    .optional(),

  isActive: z.boolean().optional()
});

export async function alertRoutes(
  app: FastifyInstance,
  alertService: AlertService
) {
  app.post("/alerts", async (request, reply) => {
    const parsed = createAlertSchema.safeParse(
      request.body
    );

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid request",
        details: parsed.error.flatten()
      });
    }

    const alertId =
      await alertService.createAlert(parsed.data);

    const alert =
      await alertService.getAlert(alertId);

    return reply.status(201).send(alert);
  });

  app.get("/alerts/:id", async (request, reply) => {
    const { id } = request.params as {
      id: string;
    };

    const alertId = Number(id);

    if (!Number.isInteger(alertId)) {
      return reply.status(400).send({
        error: "Invalid alert id"
      });
    }

    const alert =
      await alertService.getAlert(alertId);

    if (!alert) {
      return reply.status(404).send({
        error: "Alert not found"
      });
    }

    return reply.send(alert);
  });

  app.get(
    "/users/:userId/alerts",
    async (request, reply) => {
      const { userId } = request.params as {
        userId: string;
      };

      const parsedUserId = Number(userId);

      if (!Number.isInteger(parsedUserId)) {
        return reply.status(400).send({
          error: "Invalid user id"
        });
      }

      const alerts =
        await alertService.getUserAlerts(
          parsedUserId
        );

      return reply.send(alerts);
    }
  );

  app.put("/alerts/:id", async (request, reply) => {
    const { id } = request.params as {
      id: string;
    };

    const alertId = Number(id);

    if (!Number.isInteger(alertId)) {
      return reply.status(400).send({
        error: "Invalid alert id"
      });
    }

    const parsed = updateAlertSchema.safeParse(
      request.body
    );

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid request",
        details: parsed.error.flatten()
      });
    }

    try {
      await alertService.updateAlert(
        alertId,
        parsed.data
      );

      const alert =
        await alertService.getAlert(alertId);

      return reply.send(alert);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Alert not found"
      ) {
        return reply.status(404).send({
          error: "Alert not found"
        });
      }

      throw error;
    }
  });

  app.delete(
    "/alerts/:id",
    async (request, reply) => {
      const { id } = request.params as {
        id: string;
      };

      const alertId = Number(id);

      if (!Number.isInteger(alertId)) {
        return reply.status(400).send({
          error: "Invalid alert id"
        });
      }

      try {
        await alertService.deleteAlert(
          alertId
        );

        return reply.status(204).send();
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Alert not found"
        ) {
          return reply.status(404).send({
            error: "Alert not found"
          });
        }

        throw error;
      }
    }
  );
}