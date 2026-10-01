import {
  NotificationCandidate,
  NotificationRepository
} from "../repositories/notification.repository.js";

export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository
  ) {}

  async createForMatches(
    candidates: NotificationCandidate[],
    productId: string,
    discountPercent: number
  ) {
    return this.notificationRepository.createForMatches(
      candidates,
      productId,
      discountPercent
    );
  }
}