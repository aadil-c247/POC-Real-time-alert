# Real-Time Alert Matching POC

A backend proof-of-concept for matching high-frequency product events against user-configured alerts and generating notifications without scanning all users for every incoming event.

The POC focuses on:

* Optimized alert matching
* Low-latency product event processing
* Dynamic alert CRUD
* PostgreSQL-based persistence
* Duplicate notification prevention
* Bulk notification creation
* Benchmarking with 100,000 alert configurations

---

## Tech Stack

* **Node.js**
* **TypeScript**
* **Fastify**
* **PostgreSQL 16**
* **Docker**
* **pg** — PostgreSQL client
* **Zod** — request validation

Kafka and Redis are intentionally not included in this initial POC. The goal is to first validate the matching logic, database design, latency, and duplicate prevention.

---

# Architecture

```text
                         Product Event
                              │
                              ▼
                     ┌─────────────────┐
                     │  Fastify Route  │
                     │ POST /events/...│
                     └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │ Matching Service│
                     └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │ Matching        │
                     │ Repository      │
                     └────────┬────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   PostgreSQL     │
                    │ Indexed Matching │
                    └────────┬─────────┘
                             │
                    Matching Alerts
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Notification Service│
                  └──────────┬──────────┘
                             │
                             ▼
                 Bulk Dedup + Notification
                             │
                             ▼
                       PostgreSQL
```

The application follows a simple separation of concerns:

```text
Route
  ↓
Service
  ↓
Repository
  ↓
PostgreSQL
```

---

# Alert Matching Rules

Each alert contains:

* User ID
* Minimum discount percentage
* Product categories
* Product types
* Seller types
* Active/inactive status

Example:

```json
{
  "userId": 101,
  "minimumDiscountPercent": 15,
  "categories": ["Electronics", "Fashion"],
  "productTypes": ["Mobile", "Laptop"],
  "sellerTypes": ["Verified", "Premium"],
  "isActive": true
}
```

A product event matches an alert when:

```text
alert is active
AND
event discount >= alert minimum discount
AND
event category matches one configured category
AND
event product type matches one configured product type
AND
event seller type matches one configured seller type
```

Within each array, matching is **OR**.

Across the different dimensions, matching is **AND**.

For example:

```text
Categories:
Electronics OR Fashion

Product Types:
Mobile OR Laptop

Seller Types:
Verified OR Premium

Overall:
(Category Match)
AND
(Product Type Match)
AND
(Seller Type Match)
AND
(Discount Match)
AND
(Active Alert)
```

---

# Database Design

The main tables are:

### `alert_configs`

Stores the main alert configuration.

```text
id
user_id
minimum_discount_percent
is_active
created_at
updated_at
```

### `alert_categories`

Stores categories associated with each alert.

```text
alert_id
category
```

### `alert_product_types`

Stores product types associated with each alert.

```text
alert_id
product_type
```

### `alert_seller_types`

Stores seller types associated with each alert.

```text
alert_id
seller_type
```

### `notifications`

Stores generated notifications.

```text
id
user_id
alert_id
product_id
discount_percent
created_at
```

### `notification_dedup`

Used to prevent duplicate notifications for the same alert and product within the configured deduplication window.

```text
alert_id
product_id
expires_at
```

The table has a primary key on:

```text
(alert_id, product_id)
```

This provides database-level protection against duplicate notification creation.

---

# Database Indexing

Indexes were added to support the event matching path:

```sql
CREATE INDEX idx_alert_configs_active_discount
ON alert_configs (minimum_discount_percent)
WHERE is_active = TRUE;
```

```sql
CREATE INDEX idx_alert_categories_category
ON alert_categories (category, alert_id);
```

```sql
CREATE INDEX idx_alert_product_types_type
ON alert_product_types (product_type, alert_id);
```

```sql
CREATE INDEX idx_alert_seller_types_type
ON alert_seller_types (seller_type, alert_id);
```

The mapping-table indexes allow PostgreSQL to narrow down candidate alerts using the incoming event attributes instead of loading every alert into the application.

---

# API Endpoints

## 1. Health Check

### `GET /health`

Checks whether the application is running.

Example:

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "ok"
}
```

---

## 2. Database Health Check

### `GET /db-health`

Checks whether the application can successfully connect to PostgreSQL.

Example:

```bash
curl http://localhost:3000/db-health
```

Example response:

```json
{
  "status": "ok",
  "database": "connected",
  "time": "2026-..."
}
```

---

# Alert APIs

## 3. Create Alert

### `POST /alerts`

Creates a new alert configuration.

Request:

```json
{
  "userId": 101,
  "minimumDiscountPercent": 15,
  "categories": [
    "Electronics",
    "Fashion"
  ],
  "productTypes": [
    "Mobile",
    "Laptop"
  ],
  "sellerTypes": [
    "Verified",
    "Premium"
  ],
  "isActive": true
}
```

---

## 4. Get Alert

### `GET /alerts/:id`

Retrieves a specific alert.

Example:

```bash
curl http://localhost:3000/alerts/1
```

---

## 5. Get User Alerts

### `GET /users/:userId/alerts`

Returns all alerts belonging to a user.

Example:

```bash
curl http://localhost:3000/users/101/alerts
```

---

## 6. Update Alert

### `PUT /alerts/:id`

Updates an existing alert.

Example:

```json
{
  "minimumDiscountPercent": 20,
  "categories": [
    "Electronics"
  ],
  "productTypes": [
    "Mobile"
  ],
  "sellerTypes": [
    "Verified"
  ],
  "isActive": true
}
```

All update fields are optional.

---

## 7. Delete Alert

### `DELETE /alerts/:id`

Deletes an alert.

Associated category, product-type, seller-type, and deduplication records are removed through PostgreSQL cascade behavior.

Example:

```bash
curl -X DELETE http://localhost:3000/alerts/1
```

---

# Product Event API

## 8. Process Product Event

### `POST /events/products`

This is the main real-time matching endpoint.

Example request:

```json
{
  "productId": "prd_10021",
  "category": "Electronics",
  "productType": "Mobile",
  "sellerType": "Verified",
  "discountPercent": 18.5,
  "price": 49999,
  "timestamp": 1716713000
}
```

The event is:

1. Validated using Zod
2. Passed to the matching service
3. Matched against active alerts in PostgreSQL
4. Deduplication is checked
5. Notifications are created in bulk
6. Matching/notification statistics are returned

Example response:

```json
{
  "productId": "prd_10021",
  "matchedAlerts": 3333,
  "notificationsCreated": 3333,
  "notifications": []
}
```

---

# Duplicate Notification Prevention

The same product should not repeatedly notify the same alert within the deduplication window.

The implementation uses:

```text
notification_dedup
        │
        ▼
(alert_id, product_id)
        │
        ▼
PostgreSQL unique constraint
```

The notification creation query uses an atomic PostgreSQL operation:

```sql
INSERT ... ON CONFLICT ...
```

If the existing deduplication record is still valid, the notification is not created.

This also provides protection when multiple requests attempt to process the same alert/product combination concurrently.

For example:

```text
First event:
Product A → Alert 123 → Notification created

Same product again:
Product A → Alert 123 → Duplicate prevented
```

---

# Benchmark

The matching implementation was benchmarked with:

```text
100,000 alert configurations
```

The benchmark data was generated using:

```text
scripts/seed-benchmark.sql
```

The dataset contained combinations of:

```text
Categories:
Electronics
Fashion
Home
Sports

Product Types:
Mobile
Laptop
TV
Shoes

Seller Types:
Verified
Premium
Standard

Discount thresholds:
10%
15%
20%
25%
30%
```

All 100,000 alerts were active.

---

# Matching Query Benchmark

The primary matching query uses indexed `EXISTS` conditions:

```sql
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
```

Benchmark event:

```json
{
  "category": "Electronics",
  "productType": "Mobile",
  "sellerType": "Verified",
  "discountPercent": 18.5
}
```

Result:

```text
100,000 alerts
       ↓
8,333 candidate alerts
       ↓
3,333 final matching alerts
```

Measured PostgreSQL execution time:

```text
~28.8 ms
```

The query plan showed that PostgreSQL used the indexes on:

```text
alert_categories
alert_product_types
alert_seller_types
```

The mapping-table scans were index-only scans with:

```text
Heap Fetches: 0
```

---

# Query Optimization Comparison

Multiple query approaches were benchmarked.

| Query approach          | Execution time |
| ----------------------- | -------------: |
| `EXISTS` based matching |   **~28.8 ms** |
| JOIN based matching     |       ~30.6 ms |
| Candidate CTE + join    |       ~49.4 ms |

The `EXISTS` implementation was kept because it produced the best measured result for this dataset.

The candidate CTE approach was slower because PostgreSQL performed a sequential scan of `alert_configs` during that execution plan.

The decision was therefore based on measured query performance rather than theoretical optimization.

---

# End-to-End API Benchmark

The complete API was also tested through `curl`.

Three separate product IDs were used to avoid the deduplication mechanism affecting the measurement.

Results:

```text
benchmark_product_002
total = 0.142426s

benchmark_product_003
total = 0.142649s

benchmark_product_004
total = 0.138558s
```

Average:

```text
~141.2 ms
```

Therefore:

```text
PostgreSQL matching:
~28.8 ms

Complete HTTP request:
~139–143 ms
```

The end-to-end time includes:

* HTTP request/response
* Fastify processing
* request validation
* PostgreSQL matching
* bulk deduplication
* bulk notification insertion
* Node.js processing overhead

---

# Duplicate Test

The same product ID was submitted again after the first successful processing.

Expected behavior:

```text
First request:
matchedAlerts       = 3333
notificationsCreated = 3333

Repeated request:
matchedAlerts       = 3333
notificationsCreated = 0
```

This verifies that matching and notification creation are separate concerns:

```text
Alert matches product
        ≠
Notification must always be created
```

An alert can still match the event while the notification is suppressed because it is within the deduplication window.

---

# Running the Project

## Prerequisites

Install:

* Node.js
* npm
* Docker
* Docker Compose

---

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Configure Environment

Create `.env`:

```env
PORT=3000

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=realtime_alert
DATABASE_USER=alert_user
DATABASE_PASSWORD=alert_password
```

---

## 3. Start PostgreSQL

```bash
docker compose up -d
```

Verify:

```bash
docker ps
```

---

## 4. Run Database Migration

```bash
docker exec -i realtime-alert-postgres \
  psql -U alert_user -d realtime_alert \
  < migrations/001_create_alert_tables.sql
```

---

## 5. Start the Application

Development mode:

```bash
npm run dev
```

The application runs on:

```text
http://localhost:3000
```

---

# Running the Benchmark

To generate the 100,000-alert benchmark dataset:

```bash
docker exec -i realtime-alert-postgres \
  psql -U alert_user -d realtime_alert \
  < scripts/seed-benchmark.sql
```

Then run the application:

```bash
npm run dev
```

Send a product event:

```bash
curl -X POST http://localhost:3000/events/products \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "benchmark_product_001",
    "category": "Electronics",
    "productType": "Mobile",
    "sellerType": "Verified",
    "discountPercent": 18.5,
    "price": 49999,
    "timestamp": 1716713000
  }'
```

For latency measurement:

```bash
curl -s \
  -o /dev/null \
  -w 'total=%{time_total}s\n' \
  -X POST http://localhost:3000/events/products \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "benchmark_product_002",
    "category": "Electronics",
    "productType": "Mobile",
    "sellerType": "Verified",
    "discountPercent": 18.5,
    "price": 49999,
    "timestamp": 1716713000
  }'
```

Use a new `productId` for each latency test so the deduplication mechanism does not suppress the notification operation.

---

# Project Structure

```text
realtime-alert/
│
├── migrations/
│   └── 001_create_alert_tables.sql
│
├── scripts/
│   └── seed-benchmark.sql
│
├── src/
│   ├── config/
│   │   └── database.ts
│   │
│   ├── repositories/
│   │   ├── alert.repository.ts
│   │   ├── matching.repository.ts
│   │   └── notification.repository.ts
│   │
│   ├── routes/
│   │   ├── alert.routes.ts
│   │   └── product.routes.ts
│   │
│   ├── schemas/
│   │   └── product-event.schema.ts
│   │
│   ├── services/
│   │   ├── alert.service.ts
│   │   ├── matching.service.ts
│   │   └── notification.service.ts
│   │
│   ├── types/
│   │   ├── alert.ts
│   │   └── product-event.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

---

# Design Decisions

### Why PostgreSQL for matching?

The alert configuration is relational and persistent. PostgreSQL can efficiently perform the required matching using indexes without loading all alert configurations into Node.js.

### Why `EXISTS`?

`EXISTS` allows each alert dimension to be checked independently while avoiding row multiplication from joining multiple mapping tables.

It also performed better than the alternative query approaches tested against the 100k-alert dataset.

### Why bulk notification creation?

Creating a separate database transaction for every matching alert would create thousands of database round trips for a single product event.

The current implementation sends the candidate alert IDs to PostgreSQL and performs deduplication and notification insertion in bulk.


---

# Summary

This POC demonstrates a real-time alert matching system capable of:

* Managing alert configurations dynamically
* Matching incoming product events against 100k alert configurations
* Using indexed database-side matching instead of application-level full scans
* Returning approximately 3,333 matches from the benchmark dataset
* Performing the core PostgreSQL matching operation in approximately **28.8 ms**
* Processing the complete HTTP flow in approximately **139–143 ms**
* Creating notifications in bulk
* Preventing duplicate notifications using PostgreSQL-backed deduplication
* Maintaining a clean Route → Service → Repository architecture

The implementation focuses on proving the core matching and notification workflow first, while leaving distributed event processing infrastructure such as Kafka and Redis as future scaling steps.
