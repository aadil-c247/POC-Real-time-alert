-- Clean previous benchmark data
TRUNCATE TABLE
    notifications,
    notification_dedup,
    alert_categories,
    alert_product_types,
    alert_seller_types,
    alert_configs
RESTART IDENTITY CASCADE;


-- 100,000 alerts
INSERT INTO alert_configs (
    user_id,
    minimum_discount_percent,
    is_active
)
SELECT
    100000 + gs,
    CASE
        WHEN gs % 5 = 0 THEN 10
        WHEN gs % 5 = 1 THEN 15
        WHEN gs % 5 = 2 THEN 20
        WHEN gs % 5 = 3 THEN 25
        ELSE 30
    END,
    TRUE
FROM generate_series(1, 100000) AS gs;


-- Category preferences
INSERT INTO alert_categories (
    alert_id,
    category
)
SELECT
    id,
    CASE
        WHEN id % 4 = 0 THEN 'Electronics'
        WHEN id % 4 = 1 THEN 'Fashion'
        WHEN id % 4 = 2 THEN 'Home'
        ELSE 'Sports'
    END
FROM alert_configs;


-- Product type preferences
INSERT INTO alert_product_types (
    alert_id,
    product_type
)
SELECT
    id,
    CASE
        WHEN id % 4 = 0 THEN 'Mobile'
        WHEN id % 4 = 1 THEN 'Laptop'
        WHEN id % 4 = 2 THEN 'TV'
        ELSE 'Shoes'
    END
FROM alert_configs;


-- Seller type preferences
INSERT INTO alert_seller_types (
    alert_id,
    seller_type
)
SELECT
    id,
    CASE
        WHEN id % 3 = 0 THEN 'Verified'
        WHEN id % 3 = 1 THEN 'Premium'
        ELSE 'Standard'
    END
FROM alert_configs;


ANALYZE alert_configs;
ANALYZE alert_categories;
ANALYZE alert_product_types;
ANALYZE alert_seller_types;