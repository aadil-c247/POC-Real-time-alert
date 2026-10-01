import { Pool } from "pg";

export interface NotificationCandidate {
  userId: number;
  alertId: number;
}

export interface BulkNotificationResult {
  alertId: number;
  userId: number;
  productId: string;
}

export class NotificationRepository {
  constructor(private readonly pool: Pool) {}

  async createForMatches(
    candidates: NotificationCandidate[],
    productId: string,
    discountPercent: number,
    dedupWindowMinutes = 5
  ): Promise<BulkNotificationResult[]> {
    if (candidates.length === 0) {
      return [];
    }

    const alertIds = candidates.map(
      (candidate) => candidate.alertId
    );

    const userIds = candidates.map(
      (candidate) => candidate.userId
    );

    const result = await this.pool.query(
      `
      WITH candidates AS (
        SELECT *
        FROM unnest(
          $1::BIGINT[],
          $2::BIGINT[]
        ) AS t(alert_id, user_id)
      ),

      claimed AS (
        INSERT INTO notification_dedup (
          alert_id,
          product_id,
          expires_at
        )
        SELECT
          c.alert_id,
          $3,
          NOW() + ($4 * INTERVAL '1 minute')
        FROM candidates c

        ON CONFLICT (alert_id, product_id)
        DO UPDATE
        SET expires_at = EXCLUDED.expires_at

        WHERE notification_dedup.expires_at <= NOW()

        RETURNING
          alert_id,
          product_id
      )

      INSERT INTO notifications (
        user_id,
        alert_id,
        product_id,
        discount_percent
      )
      SELECT
        c.user_id,
        cl.alert_id,
        cl.product_id,
        $5
      FROM claimed cl
      INNER JOIN candidates c
        ON c.alert_id = cl.alert_id

      RETURNING
        alert_id,
        user_id,
        product_id
      `,
      [
        alertIds,
        userIds,
        productId,
        dedupWindowMinutes,
        discountPercent
      ]
    );

    return result.rows.map((row) => ({
      alertId: Number(row.alert_id),
      userId: Number(row.user_id),
      productId: row.product_id
    }));
  }
}