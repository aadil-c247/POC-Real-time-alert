CREATE TABLE alert_configs (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,

    minimum_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_minimum_discount_percent
        CHECK (
            minimum_discount_percent >= 0
            AND minimum_discount_percent <= 100
        )
);


CREATE TABLE alert_categories (
    alert_id BIGINT NOT NULL
        REFERENCES alert_configs(id)
        ON DELETE CASCADE,

    category VARCHAR(100) NOT NULL,

    PRIMARY KEY (alert_id, category)
);


CREATE TABLE alert_product_types (
    alert_id BIGINT NOT NULL
        REFERENCES alert_configs(id)
        ON DELETE CASCADE,

    product_type VARCHAR(100) NOT NULL,

    PRIMARY KEY (alert_id, product_type)
);


CREATE TABLE alert_seller_types (
    alert_id BIGINT NOT NULL
        REFERENCES alert_configs(id)
        ON DELETE CASCADE,

    seller_type VARCHAR(100) NOT NULL,

    PRIMARY KEY (alert_id, seller_type)
);

-- Indexes

CREATE INDEX idx_alert_configs_active_discount
ON alert_configs (minimum_discount_percent)
WHERE is_active = TRUE;


CREATE INDEX idx_alert_categories_category
ON alert_categories (category, alert_id);


CREATE INDEX idx_alert_product_types_type
ON alert_product_types (product_type, alert_id);


CREATE INDEX idx_alert_seller_types_type
ON alert_seller_types (seller_type, alert_id);


-- Create notification table

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,

    alert_id BIGINT NOT NULL
        REFERENCES alert_configs(id)
        ON DELETE CASCADE,

    product_id VARCHAR(255) NOT NULL,

    discount_percent NUMERIC(5, 2) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes

CREATE INDEX idx_notifications_user_created
ON notifications (user_id, created_at DESC);


-- Deduplication

CREATE TABLE notification_dedup (
    alert_id BIGINT NOT NULL
        REFERENCES alert_configs(id)
        ON DELETE CASCADE,

    product_id VARCHAR(255) NOT NULL,

    expires_at TIMESTAMPTZ NOT NULL,

    PRIMARY KEY (alert_id, product_id)
);


CREATE INDEX idx_notification_dedup_expiry
ON notification_dedup (expires_at);