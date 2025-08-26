# Product Requirements Document (PRD)
## Product Matching Feature for NocoDB

## 0) One‑liner
A NocoDB feature that lets analysts search internal products and review/confirm equivalent competitor products from scraped catalogs, with fuzzy matching, price‑band filtering, audit trail, and many‑to‑many mappings, integrated within the existing NocoDB monorepo.

---

## 1) Goals & Non‑goals
**Goals**
- Let users quickly find a local (internal) product and see ranked equivalent external products.
- Provide flexible search: by category, brand, source, status, and free‑text.
- Support fuzzy matching, brand/category agreement, and price‑band (+/‑ 15% default) in ranking.
- Allow users to confirm one‑to‑many/ many‑to‑many matches and persist them with full audit trail.
- Integrate seamlessly with existing NocoDB bases without schema changes to user data.
- Backend‑first build following existing NocoDB patterns; then frontend integration.

**Non‑goals**
- Scraping pipelines, data cleansing, or taxonomy governance (assumed upstream).
- Changing existing internal/external tables (we reference them).
- De‑duplication inside a single catalog (can be later extension).
- Standalone application (integrated within NocoDB).

---

## 2) Primary users & roles
- **Reviewer** (analyst): search, view candidates, create/delete matches.
- **Lead Reviewer**: everything above + override, edit price band/config, bulk actions.
- **Admin**: manage sources, attribute mappings, synonyms, model weights.

Role enforcement via existing NocoDB auth system and JWT claims.

---

## 3) Data sources (read‑only)
- **Internal base/schema**: `products`, `skus`, `categories`, `media_assets`, `media_links`.
- **External base/schema**: `attribute_value_normalized` plus external `products`/`skus`/`categories` equivalents (names vary per source).

We never mutate these.

---

## 4) New NocoDB schema (write‑only tables)
Create in existing NocoDB schema with `nc_` prefix following existing patterns.

### 4.1 Tables
**nc_product_match_sources** — catalog sources and display metadata
- `id` (pk, string, 20 chars) // Following existing pattern
- `name` (text, unique)
- `code` (text, unique, e.g., `AMZ`, `TGT`)
- `base_config` (text) // JSON string following existing pattern
- `is_active` (bool, default true)
- `created_at`, `created_by`, `updated_at`, `updated_by` // Following existing pattern

**nc_product_match_brand_synonyms** — brand normalization (optional but recommended)
- `id` (pk, string, 20 chars)
- `tenant_id` (text)
- `brand_canonical` (text)
- `brand_variant` (text)
- `confidence` (numeric)
- `created_at`, `created_by`, `updated_at`, `updated_by`

**nc_product_match_category_map** — crosswalk between internal and external category ids/paths
- `id` (pk, string, 20 chars)
- `tenant_id` (text)
- `internal_category_id` (text)
- `external_category_key` (text) // source‑specific cat id or path
- `source_id` (string, 20 chars fk nc_product_match_sources)

**nc_product_match_rules** — per‑tenant tunables
- `id` (pk, string, 20 chars)
- `tenant_id` (text)
- `name` (text)
- `weights` (text) // JSON string following existing pattern
- `price_band_pct` (numeric, default 15)
- `algorithm` (text, default "jarowinkler")
- `min_score` (numeric, default 0.65)
- `is_default` (bool)
- `created_at`, `created_by`, `updated_at`, `updated_by`

**nc_product_match_sessions** — optional review session header
- `id` (pk, string, 20 chars)
- `tenant_id`
- `created_by`
- `note` (text)
- `created_at`, `updated_at`

**nc_product_matches** — confirmed equivalences (many‑to‑many)
- `id` (pk, string, 20 chars)
- `tenant_id`
- `local_product_id` (text) // internal product id
- `external_product_key` (text) // primary key from external product table
- `source_id` (string, 20 chars fk nc_product_match_sources)
- `score` (numeric) // score at time of confirmation
- `price_delta_pct` (numeric)
- `rule_id` (string, 20 chars fk nc_product_match_rules)
- `session_id` (string, 20 chars fk nc_product_match_sessions, nullable)
- `status` (text enum: `confirmed`, `rejected`, `superseded`)
- `reviewed_by`
- `reviewed_at`
- `notes` (text)
- `version` (int, default 1)
- `created_at`, `created_by`, `updated_at`, `updated_by`
- **Indexes**: `(tenant_id, local_product_id)`, `(tenant_id, external_product_key, source_id)` unique on active rows

**nc_product_match_candidates** — cached/ranked suggestions (ephemeral)
- `id` (pk, string, 20 chars)
- `tenant_id`
- `local_product_id`
- `external_product_key`
- `source_id`
- `score` (numeric)
- `explanations` (text) // JSON string following existing pattern
- `generated_at`
- `created_at`, `created_by`, `updated_at`, `updated_by`
- **Indexes**: `(tenant_id, local_product_id, score desc)`

**nc_product_search_log** — audit of searches for analytics
- `id` (pk, string, 20 chars)
- `tenant_id`
- `user_id`
- `query` (text) // JSON string following existing pattern
- `result_count` (int)
- `created_at`, `created_by`, `updated_at`, `updated_by`

> **Note**: All tables follow existing NocoDB patterns with string IDs, JSON stored as text, and standard audit fields.

### 4.2 Views (for NocoDB UI convenience)
- `vw_nc_product_matches_expanded`: joins `nc_product_matches` with internal `products` and external product table for read‑only browsing.

---

## 5) Matching logic (service spec)
**Inputs**: local product, candidate filters (brand/category/source/price band), rule set (weights, algorithm, min score).

**Features**
- **Name similarity**: normalized title; strip stop‑words, color adjectives, pack‑count; Jaro‑Winkler or token‑set ratio.
- **Brand**: exact or synonym match (via `nc_product_match_brand_synonyms`).
- **Category**: internal category mapped to external via `nc_product_match_category_map`; score 1.0 if mapped; 0.5 if same top‑level.
- **Price band**: within band → 1.0, else linear decay to 0.
- **GTIN/UPC** (if present): hard 1.0 and boost to top.

**Score** = `w_name*name + w_brand*brand + w_cat*cat + w_price*price (+ w_gtin*gtin)`.

**Candidate generation**
- Pre‑filter by brand, category map, source, price window (±band%), optional full‑text on external titles.
- Rank by Score; return top N (default 25).

**Explainability**
- Return feature scores + final score in `explanations` to show UI chips like "Name 0.88, Brand ✓, Price +8%".

---

## 6) REST API specification
Base path: `/api/v1/db/data/v1/:projectId/:tableName/product-matching` (following existing NocoDB pattern). All responses JSON. Pagination: `limit`, `offset` (max 100). Sorting: `sortBy`, `sortDir`.

### 6.1 Health & Info
- `GET /health` → `{ status:"ok", version, time }`
- `GET /info` → `{ tenant_id, sources:[...], rules:[...]} `

### 6.2 Search local products
- `GET /products`
  - **Query**: `q` (text), `categoryId`, `brand`, `status`, `limit`, `offset`, `sortBy` (title|brand|updated_at), `sortDir`.
  - **Response**: `{ items:[{ product_id, title, brand, category_id, price, media:[...] }], page, total }`
  - **Notes**: reads internal base via existing NocoDB data access; does not write.

### 6.3 Get candidate matches for a local product
- `GET /products/{productId}/candidates`
  - **Query**: `sources` (csv of source codes), `brand`, `categoryId`, `priceBandPct` (default from rule), `ruleId`, `limit` (default 25).
  - **Response**: `{ items:[{ external_product_key, source:{id,code,name}, title, brand, price, image, score, explanations, gtin }], generated_at }`

### 6.4 Confirm or reject a match
- `POST /matches`
  - **Body**: `{ local_product_id, external_product_key, source_code, score, price_delta_pct, rule_id, status:"confirmed"|"rejected", session_id?, notes? }`
  - **Response**: `{ match_id, ... }`

- `DELETE /matches/{matchId}` — soft delete (mark `superseded`).

- `GET /matches`
  - **Query**: `localProductId?`, `externalProductKey?`, `source?`, `reviewedBy?`, `status?`, `limit`, `offset`...
  - **Response**: list with joined product summaries.

### 6.5 Sessions (optional)
- `POST /sessions` `{ note }` → `{ session_id }`
- `GET /sessions/{id}` with matches.

### 6.6 Admin
- `GET /rules` / `POST /rules` / `PATCH /rules/{id}`
- `GET /sources` / `POST /sources` / `PATCH /sources/{id}`
- `POST /brand-synonyms` / `POST /category-map`

### 6.7 Telemetry
- `POST /search-log`  `{ query, result_count }` (best‑effort fire‑and‑forget)

**Error model**: `{ error: { code, message, details? } }` with 4xx/5xx (following existing NocoDB pattern).

---

## 7) Sample payloads
### 7.1 /products
`GET /products?q=stroller&brand=UPPAbaby&limit=20&offset=0`
→
```json
{
  "page": 1,
  "total": 437,
  "items": [
    {
      "product_id": "P-12345",
      "title": "UPPAbaby VISTA V2 Stroller",
      "brand": "UPPAbaby",
      "category_id": "CAT-STROLLERS",
      "price": 969.99,
      "media": [{"url": ".../vista.jpg"}]
    }
  ]
}
```

### 7.2 /products/{id}/candidates
`GET /products/P-12345/candidates?sources=TGT,AMZ&priceBandPct=15&limit=5`
→
```json
{
  "generated_at": "2025-08-21T10:00:00Z",
  "items": [
    {
      "external_product_key": "AMZ:ASIN-B09...",
      "source": {"code":"AMZ","name":"Amazon"},
      "title": "UPPAbaby Vista V2 Stroller",
      "brand": "UPPAbaby",
      "price": 959.00,
      "image": "https://...",
      "gtin": "8717447138327",
      "score": 0.92,
      "explanations": {"name":0.88, "brand":1.0, "category":1.0, "price":0.95}
    }
  ]
}
```

### 7.3 POST /matches
```json
{
  "local_product_id": "P-12345",
  "external_product_key": "AMZ:ASIN-B09...",
  "source_code": "AMZ",
  "score": 0.92,
  "price_delta_pct": -1.1,
  "rule_id": "RULE-DEFAULT",
  "status": "confirmed",
  "notes": "Exact brand + GTIN match"
}
```
→ `{ "match_id": "M-7890" }`

---

## 8) Integration with existing NocoDB
Use existing NocoDB data access patterns and services.

**Data Access** (TypeScript)
```ts
// Use existing DataV3Service and MetaService patterns
interface ProductMatchingService {
  getProducts(filter: ProductFilter): Promise<Paged<Product>>
  getProductById(id: string): Promise<Product>
  getExternalCandidates(local: Product, filter: CandidateFilter): Promise<Paged<ExternalProduct>>
}
```

**Configuration** (following existing pattern)
```json
// Store in existing NocoDB configuration system
{
  "tenant_id": "acme",
  "internal": {"baseId": "b_xyz", "productsTable": "products", "categoriesTable": "categories"},
  "sources": [{"code": "AMZ", "baseId": "b_amz", "productsTable": "products", "attrTable": "attribute_value_normalized"}]
}
```

---

## 9) NocoDB monorepo structure
```
packages/
├── nc-gui/                           # Existing frontend
│   ├── components/workspace/
│   │   └── product-matching/         # New product matching UI
│   │       ├── view.vue              # Main component (following chat pattern)
│   │       ├── ProductSearch.vue     # Search interface
│   │       ├── ProductComparison.vue # Comparison view
│   │       └── ProductCard.vue       # Individual product display
│   ├── composables/
│   │   └── useProductMatching.ts     # Business logic (following useChat pattern)
│   └── pages/index/[typeOrId]/
│       └── product-matching.vue      # Route page
├── nocodb/                           # Existing backend
│   ├── src/controllers/
│   │   └── product-matching.controller.ts  # New controller (following ai.controller pattern)
│   ├── src/services/
│   │   ├── product-matching.service.ts     # Core business logic
│   │   ├── product-search.service.ts       # Search functionality
│   │   └── product-matching-engine.service.ts # Matching algorithm
│   ├── src/models/
│   │   ├── ProductMatchSession.ts    # Following AiConversation pattern
│   │   ├── ProductMatch.ts           # Following AiMessage pattern
│   │   └── ProductMatchSource.ts     # Configuration model
│   └── src/meta/migrations/v2/
│       ├── nc_094_product_match_tables.ts  # Following existing migration pattern
│       └── nc_095_product_match_indexes.ts
```

**Build**: Uses existing pnpm workspaces and build system. Follows existing lint & type‑check patterns.

---

## 10) Backend details (following existing patterns)
**Framework**: Existing NestJS backend with new modules
**DB**: Uses existing database patterns (SQLite/Postgres compatible)
**Auth**: Reuse existing NocoDB JWT and GlobalGuard
**Caching**: Integrate with existing caching patterns
**Rate limiting**: Use existing throttling system
**Observability**: Use existing logging and monitoring

**API Documentation**: Follow existing OpenAPI patterns

---

## 11) Frontend (integrated NocoDB module)
- Vue.js + Ant Design (following existing patterns). Routes:
  - `/product-matching` list + filters panel (Brand, Category, Source, Status, text search).
  - Right panel shows candidate grid with score badges and price delta (±%).
  - "Confirm match" button posts to API and updates left list pill counts.
- Accessibility: Follow existing accessibility patterns
- Component structure: Follow existing Vue.js patterns like chat feature

---

## 12) Security & Permissions (following existing patterns)
- Use existing NocoDB permission system
- Row‑level security by `tenant_id` on all tables
- Only Admin can mutate rules/sources (following existing admin patterns)
- Soft delete with `status = superseded` and `version` increment
- Use existing audit trail system

---

## 13) Testing strategy (following existing patterns)
- **Unit**: Use existing Jest setup for backend, Vitest for frontend
- **Integration**: Use existing test patterns and mock data
- **E2E**: Use existing Playwright setup
- **Seed**: Use existing test data patterns

---

## 14) Migrations (following existing pattern)
```typescript
// packages/nocodb/src/meta/migrations/v2/nc_094_product_match_tables.ts
import type { Knex } from 'knex';
import { MetaTable } from '~/utils/globals';

const up = async (knex: Knex) => {
  await knex.schema.createTable(MetaTable.PRODUCT_MATCH_SOURCES, (table) => {
    table.string('id', 20).primary();
    table.string('name').notNullable();
    table.string('code').notNullable().unique();
    table.text('base_config').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.string('created_at', 30).notNullable();
    table.string('created_by');
    table.string('updated_at', 30);
    table.string('updated_by');
  });
  // ... repeat for other tables
};

const down = async (knex: Knex) => {
  await knex.schema.dropTable(MetaTable.PRODUCT_MATCH_SOURCES);
  // ... repeat for other tables
};

export { up, down };
```

---

## 15) Rollout plan (following existing patterns)
1. Create nc_* schema via migration; deploy backend in read‑only mode.
2. Hook up to existing NocoDB data access using existing patterns.
3. Validate `/products` and `/candidates` with existing test patterns.
4. Enable `/matches` write path for a pilot tenant.
5. Backfill existing confirmed links if any; lock down permissions.
6. Switch on UI for all tenants using existing deployment patterns.

---

## 16) Future extensions
- Attribute‑level comparison view (dimensions, weight, fabrics, safety certifications).
- Auto‑link with high‑confidence (GTIN + name > 0.95) and queue for review.
- Bulk tools; CSV import/export; webhook to upsert equivalence into PIM.
- Model experimentation per category (e.g., strollers vs. high chairs).

---

## 17) Acceptance criteria (MVP)
- User can search internal products with all filters using existing NocoDB data access.
- For a selected product, system returns ranked candidates considering name, brand, category, price band.
- Reviewer can confirm or reject matches; persisted with existing audit trail.
- All APIs documented and following existing NocoDB patterns.
- No changes to existing internal/external tables; only nc_* tables are new.
- Works with multiple sources and tenants using existing tenant isolation.
- Integrates seamlessly with existing NocoDB UI and navigation patterns.

