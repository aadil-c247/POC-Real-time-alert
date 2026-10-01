import { Pool, PoolClient } from "pg";
import {
  CreateAlertInput,
  UpdateAlertInput
} from "../types/alert.js";

export class AlertRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateAlertInput): Promise<number> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const alertResult = await client.query(
        `
        INSERT INTO alert_configs (
          user_id,
          minimum_discount_percent,
          is_active
        )
        VALUES ($1, $2, $3)
        RETURNING id
        `,
        [
          input.userId,
          input.minimumDiscountPercent,
          input.isActive ?? true
        ]
      );

      const alertId = alertResult.rows[0].id;

      await this.insertCategories(
        client,
        alertId,
        input.categories
      );

      await this.insertProductTypes(
        client,
        alertId,
        input.productTypes
      );

      await this.insertSellerTypes(
        client,
        alertId,
        input.sellerTypes
      );

      await client.query("COMMIT");

      return Number(alertId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async insertCategories(
    client: PoolClient,
    alertId: number,
    categories: string[]
  ): Promise<void> {
    for (const category of categories) {
      await client.query(
        `
        INSERT INTO alert_categories (
          alert_id,
          category
        )
        VALUES ($1, $2)
        `,
        [alertId, category]
      );
    }
  }

  private async insertProductTypes(
    client: PoolClient,
    alertId: number,
    productTypes: string[]
  ): Promise<void> {
    for (const productType of productTypes) {
      await client.query(
        `
        INSERT INTO alert_product_types (
          alert_id,
          product_type
        )
        VALUES ($1, $2)
        `,
        [alertId, productType]
      );
    }
  }

  private async insertSellerTypes(
    client: PoolClient,
    alertId: number,
    sellerTypes: string[]
  ): Promise<void> {
    for (const sellerType of sellerTypes) {
      await client.query(
        `
        INSERT INTO alert_seller_types (
          alert_id,
          seller_type
        )
        VALUES ($1, $2)
        `,
        [alertId, sellerType]
      );
    }
  }

  async findById(alertId: number) {
    const result = await this.pool.query(
      `
      SELECT
        id,
        user_id,
        minimum_discount_percent,
        is_active,
        created_at,
        updated_at
      FROM alert_configs
      WHERE id = $1
      `,
      [alertId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const alert = result.rows[0];

    const categories = await this.pool.query(
      `
      SELECT category
      FROM alert_categories
      WHERE alert_id = $1
      ORDER BY category
      `,
      [alertId]
    );

    const productTypes = await this.pool.query(
      `
      SELECT product_type
      FROM alert_product_types
      WHERE alert_id = $1
      ORDER BY product_type
      `,
      [alertId]
    );

    const sellerTypes = await this.pool.query(
      `
      SELECT seller_type
      FROM alert_seller_types
      WHERE alert_id = $1
      ORDER BY seller_type
      `,
      [alertId]
    );

    return {
      id: Number(alert.id),
      userId: Number(alert.user_id),
      minimumDiscountPercent: Number(
        alert.minimum_discount_percent
      ),
      categories: categories.rows.map(
        (row) => row.category
      ),
      productTypes: productTypes.rows.map(
        (row) => row.product_type
      ),
      sellerTypes: sellerTypes.rows.map(
        (row) => row.seller_type
      ),
      isActive: alert.is_active,
      createdAt: alert.created_at,
      updatedAt: alert.updated_at
    };
  }

  async findByUserId(userId: number) {
    const result = await this.pool.query(
      `
      SELECT id
      FROM alert_configs
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    const alerts = [];

    for (const row of result.rows) {
      const alert = await this.findById(Number(row.id));

      if (alert) {
        alerts.push(alert);
      }
    }

    return alerts;
  }

  async update(
    alertId: number,
    input: UpdateAlertInput
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      if (input.minimumDiscountPercent !== undefined) {
        await client.query(
          `
          UPDATE alert_configs
          SET
            minimum_discount_percent = $1,
            updated_at = NOW()
          WHERE id = $2
          `,
          [
            input.minimumDiscountPercent,
            alertId
          ]
        );
      }

      if (input.isActive !== undefined) {
        await client.query(
          `
          UPDATE alert_configs
          SET
            is_active = $1,
            updated_at = NOW()
          WHERE id = $2
          `,
          [input.isActive, alertId]
        );
      }

      if (input.categories !== undefined) {
        await client.query(
          `
          DELETE FROM alert_categories
          WHERE alert_id = $1
          `,
          [alertId]
        );

        await this.insertCategories(
          client,
          alertId,
          input.categories
        );
      }

      if (input.productTypes !== undefined) {
        await client.query(
          `
          DELETE FROM alert_product_types
          WHERE alert_id = $1
          `,
          [alertId]
        );

        await this.insertProductTypes(
          client,
          alertId,
          input.productTypes
        );
      }

      if (input.sellerTypes !== undefined) {
        await client.query(
          `
          DELETE FROM alert_seller_types
          WHERE alert_id = $1
          `,
          [alertId]
        );

        await this.insertSellerTypes(
          client,
          alertId,
          input.sellerTypes
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(alertId: number): Promise<void> {
    await this.pool.query(
      `
      DELETE FROM alert_configs
      WHERE id = $1
      `,
      [alertId]
    );
  }
}