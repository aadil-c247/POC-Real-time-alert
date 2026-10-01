import { MatchingRepository } from "../repositories/matching.repository.js";
import { ProductEvent } from "../types/product-event.js";
import { NotificationService } from "./notification.service.js";

export class MatchingService {
  constructor(
    private readonly matchingRepository: MatchingRepository,
    private readonly notificationService: NotificationService
  ) {}

  async processProductEvent(event: ProductEvent) {
    const matches =
      await this.matchingRepository.findMatchingAlerts(event);

    const candidates = matches.map((match) => ({
      alertId: match.id,
      userId: match.userId
    }));

    const notifications =
      await this.notificationService.createForMatches(
        candidates,
        event.productId,
        event.discountPercent
      );

    return {
      matchedAlerts: matches.length,
      notificationsCreated: notifications.length,
      notifications
    };
  }
}