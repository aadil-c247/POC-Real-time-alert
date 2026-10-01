import { AlertRepository } from "../repositories/alert.repository.js";
import {
  CreateAlertInput,
  UpdateAlertInput
} from "../types/alert.js";

export class AlertService {
  constructor(
    private readonly alertRepository: AlertRepository
  ) {}

  async createAlert(input: CreateAlertInput) {
    return this.alertRepository.create(input);
  }

  async getAlert(alertId: number) {
    return this.alertRepository.findById(alertId);
  }

  async getUserAlerts(userId: number) {
    return this.alertRepository.findByUserId(userId);
  }

  async updateAlert(
    alertId: number,
    input: UpdateAlertInput
  ) {
    const existing = await this.alertRepository.findById(
      alertId
    );

    if (!existing) {
      throw new Error("Alert not found");
    }

    await this.alertRepository.update(
      alertId,
      input
    );
  }

  async deleteAlert(alertId: number) {
    const existing = await this.alertRepository.findById(
      alertId
    );

    if (!existing) {
      throw new Error("Alert not found");
    }

    await this.alertRepository.delete(alertId);
  }
}