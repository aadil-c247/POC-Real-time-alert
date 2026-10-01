import { FastifyInstance } from "fastify";
import { productEventSchema } from "../schemas/product-event.schema.js";
import { MatchingService } from "../services/matching.service.js";

export async function productRoutes(
  app: FastifyInstance,
  matchingService: MatchingService
) {
  app.post(
    "/events/products",
    async (request, reply) => {
      const parsed = productEventSchema.safeParse(
        request.body
      );

      if (!parsed.success) {
        return reply.status(400).send({
          error: "Invalid product event",
          details: parsed.error.flatten()
        });
      }

      const result =
        await matchingService.processProductEvent(
          parsed.data
        );

      return reply.status(200).send({
        productId: parsed.data.productId,
        ...result
      });
    }
  );
}