import { Pool } from "pg";
import { ProductEvent } from "../types/product-event.js";

export interface MatchingAlert {
  id: number;
  userId: number;
  minimumDiscountPercent: number;
}

export class MatchingRepository {
  constructor(private readonly pool: Pool) {}

  async findMatchingAlerts(
    event: ProductEvent
  ): Promise<MatchingAlert[]> {
    const result = await this.pool.query(
      `
      SELECT
        ac.id,
        ac.user_id,
        ac.minimum_discount_percent
      FROM alert_configs ac

      WHERE ac.is_active = TRUE

        AND ac.minimum_discount_percent <= $1

        AND EXISTS (
          SELECT 1
          FROM alert_categories c
          WHERE c.alert_id = ac.id
            AND c.category = $2
        )

        AND EXISTS (
          SELECT 1
          FROM alert_product_types pt
          WHERE pt.alert_id = ac.id
            AND pt.product_type = $3
        )

        AND EXISTS (
          SELECT 1
          FROM alert_seller_types st
          WHERE st.alert_id = ac.id
            AND st.seller_type = $4
        )

      ORDER BY ac.id
      `,
      [
        event.discountPercent,
        event.category,
        event.productType,
        event.sellerType
      ]
    );

    return result.rows.map((row) => ({
      id: Number(row.id),
      userId: Number(row.user_id),
      minimumDiscountPercent: Number(
        row.minimum_discount_percent
      )
    }));
  }
}