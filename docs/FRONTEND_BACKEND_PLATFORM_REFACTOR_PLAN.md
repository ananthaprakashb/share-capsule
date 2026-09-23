# Share Capsule Refactoring Plan

## 1. Decision summary

We will separate the product into two repositories with clear ownership:

- **`share-capsule`** — public frontend, content presentation, static assets, browser interaction, SEO, sharing, accessibility and progressive-web-app behavior.
- **`checklist`** — backend services, reusable domain logic, curated structured data, APIs, validation, persistence adapters, scheduled processing and administrative workflows.

The platforms will be used according to workload rather than forcing everything onto one provider:

- **Cloudflare** — global frontend delivery, edge routing, lightweight public APIs, D1-backed low-latency interactions, R2 media, KV caches, queues and edge-oriented scheduled work.
- **Vercel** — Node.js or Python backend workloads that need a richer server runtime, framework integrations, longer or more CPU-intensive processing, AI/API orchestration and operational/admin endpoints.

The initial goal is not a large rewrite. We will create stable boundaries, migrate one vertical slice at a time and keep the current site usable throughout the transition.

---

## 2. Target architecture

```text
Browser / Search Engine / Social Preview
                  |
                  v
        sharecapsule.app
  Cloudflare Workers + Static Assets
        (`share-capsule` repo)
                  |
       -------------------------
       |                       |
       v                       v
Cloudflare edge APIs      api.sharecapsule.app
D1 / KV / R2 / Queues     Vercel Functions
(lightweight, global)     (`checklist` repo)
                               |
                               v
                    external APIs / AI /
                    heavier processing / DB
```

### Request ownership

| Request type | Owner | Preferred platform |
|---|---|---|
| HTML, CSS, browser JavaScript, icons and local illustrations | `share-capsule` | Cloudflare static assets |
| SEO pages and state-based place-history pages | `share-capsule` | Cloudflare static assets or Workers |
| Public read-only catalog responses with high cacheability | `checklist` contract, served through an edge facade | Cloudflare Worker/KV |
| Votes, reactions and small counters | `checklist` domain module | Cloudflare Worker + D1 |
| User submissions and lightweight validation | `checklist` domain module | Cloudflare Worker + D1/Queue |
| Image/audio/PDF storage and delivery | shared contract | Cloudflare R2 |
| Long-running imports, source verification and enrichment | `checklist` | Vercel Functions |
| AI transformations, document processing or Python tasks | `checklist` | Vercel Functions |
| Admin-only mutation APIs and editorial tools | `checklist` | Vercel Functions |
| Frequent edge schedules and queue consumers | `checklist` deployable package | Cloudflare Workers |
| Daily or low-frequency backend maintenance jobs | `checklist` | Vercel Cron or Cloudflare Cron, selected per job |

---

## 3. Repository responsibilities

## 3.1 `share-capsule`: frontend repository

The frontend repository should contain only code needed to render and operate the public experience.

### Keep in `share-capsule`

- Public routes and page templates.
- UI components and browser-side interaction.
- Search, filtering, language switching and sharing.
- Accessibility and responsive design.
- Service worker, web manifest and offline shell.
- Static images, illustrations and presentation assets.
- Frontend API client wrappers.
- Route-level metadata, Open Graph data and structured data.
- Mock fixtures used only for frontend development.
- Cloudflare static-asset configuration and frontend deployment rules.

### Move out of `share-capsule`

- D1 SQL and persistence logic that implements business behavior.
- Server-side input validation and sanitization.
- Vote/submission domain rules.
- Scheduled data collection.
- Source verification pipelines.
- Administrative processing.
- Email-delivery orchestration.
- AI or content-enrichment workflows.
- Backend secrets and provider-specific credentials.

### Proposed frontend structure

```text
share-capsule/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── place-history/
│   │   ├── public-opportunities/
│   │   ├── government-schemes/
│   │   └── daily-cards/
│   ├── lib/
│   │   ├── api-client/
│   │   ├── analytics/
│   │   └── i18n/
│   └── styles/
├── public/
│   ├── assets/
│   ├── manifest.webmanifest
│   └── offline.html
├── tests/
├── docs/
├── wrangler.jsonc
└── package.json
```

The current static files can be migrated gradually. A framework migration is optional and should not block the separation of backend logic.

---

## 3.2 `checklist`: backend repository

The existing Checklist API design already emphasizes curated, reusable and composable data. We will extend it into the backend platform for Share Capsule while keeping its domain modules independently reusable.

### Backend responsibilities

- Public API contracts.
- Domain entities and validation.
- Source records and evidence metadata.
- Checklist composition.
- Place-history records by state.
- Votes, submissions and editorial status.
- Government-scheme and public-opportunity catalogs.
- Persistence interfaces.
- Cloudflare and Vercel deployment adapters.
- Background jobs and data-import pipelines.
- Admin/editorial APIs.
- Versioning, audit metadata and schema migrations.

### Proposed backend structure

```text
checklist/
├── packages/
│   ├── contracts/               # request/response schemas and shared types
│   ├── domain/                  # provider-neutral business rules
│   ├── catalog/                 # curated data and composition logic
│   ├── validation/              # sanitization and schema validation
│   ├── observability/           # logging, tracing and error helpers
│   └── test-fixtures/
├── apps/
│   ├── cloudflare-api/          # Worker routes, D1/KV/R2/Queue adapters
│   ├── vercel-api/              # Node/Python Functions and admin endpoints
│   └── jobs/                    # imports, verification and enrichment
├── data/
│   ├── checklists/
│   ├── place-history/
│   │   ├── tn/
│   │   ├── ap/
│   │   └── ...
│   ├── schemes/
│   └── opportunities/
├── migrations/
│   ├── d1/
│   └── primary-db/
├── docs/
├── tests/
├── wrangler.jsonc
├── vercel.json
└── package.json
```

---

## 4. Platform allocation

## 4.1 Cloudflare: best-fit responsibilities

Cloudflare should remain the public edge and frontend delivery platform.

### Use Cloudflare Workers with static assets for the frontend

A Worker with an assets binding provides one deployment model for static files and selected edge routes. Static assets should be served without invoking Worker code unless a route actually needs dynamic behavior.

Recommended configuration principle:

```jsonc
{
  "name": "share-capsule-web",
  "main": "src/worker.ts",
  "compatibility_date": "2026-07-26",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "run_worker_first": ["/api/*", "/s/*"]
  }
}
```

Exact syntax must be validated against the Wrangler version used by the repository before implementation.

### Use D1 for

- Place votes and unique-voter receipts.
- Small editorial submission records.
- Lightweight relational catalogs when globally distributed read access is useful.
- Idempotency keys and simple rate-limit counters when relational queries are needed.

### Use KV for

- Materialized public catalog snapshots.
- Frequently read state directory metadata.
- Feature flags that are not security boundaries.
- Cached API responses and source manifests.

KV is eventually consistent and should not be the authority for vote uniqueness or workflow state.

### Use R2 for

- Card backgrounds.
- Generated share images.
- Audio and downloadable media.
- Submission evidence files when accepted.
- Large catalog exports and build artifacts.

Store metadata and authorization state outside R2; store the binary object in R2.

### Use Queues for

- Submission notification delivery.
- Asynchronous moderation requests.
- Regeneration of catalog snapshots.
- Calling the Vercel backend without holding the user request open.
- Retrying transient external-service failures.

### Use Cloudflare Cron Triggers for

- Edge-cache refresh.
- Frequent source health checks.
- Queue maintenance.
- Jobs that primarily read/write Cloudflare-native services.

### Avoid on Cloudflare when

- The workload requires Node-only native dependencies.
- Processing is CPU-heavy or long-running.
- The implementation requires substantial Python libraries.
- The task performs complex AI orchestration or document conversion.
- The function should run close to a non-Cloudflare database in a chosen region.

---

## 4.2 Vercel: best-fit responsibilities

Vercel should host the richer backend runtime, not a second copy of the public frontend.

### Use Vercel Functions for

- Node.js or Python APIs requiring broader package compatibility.
- AI model calls and multi-step enrichment.
- Source crawling and structured extraction where legally and technically appropriate.
- PDF/image/audio processing.
- Admin and editorial APIs.
- Integration with email, GitHub, third-party data sources and workflow systems.
- Database workloads that should execute near the selected database region.

Fluid compute is useful for I/O-bound work because a warm instance can handle concurrent requests while waiting on external services.

### Use Vercel Cron for

- Daily catalog refresh.
- Scheduled source revalidation.
- Periodic editorial reports.
- Low-frequency maintenance jobs.

On the Hobby plan, cron frequency and timing precision are limited; frequent or precise jobs should remain on Cloudflare or move to an appropriate paid plan.

### Vercel deployment boundary

Recommended public hostname:

```text
api.sharecapsule.app
```

Only stable public endpoints should be exposed. Internal maintenance endpoints must require authentication and must not rely solely on an obscure URL.

### Avoid on Vercel when

- A request is a simple edge lookup or counter mutation.
- Data is already in D1/KV/R2 and an extra network hop would add latency.
- The endpoint can be fulfilled by a cached static snapshot.
- A high-volume endpoint would be cheaper and simpler at the Cloudflare edge.

---

## 5. API boundary and contracts

The frontend must never depend on provider-specific implementation details.

### Public URL strategy

Keep browser calls same-origin whenever possible:

```text
sharecapsule.app/api/v1/...
```

The Cloudflare frontend Worker acts as an API facade:

- Handle Cloudflare-native endpoints directly.
- Proxy selected requests to `api.sharecapsule.app`.
- Add correlation IDs.
- Enforce CORS and request-size limits.
- Normalize error responses.
- Hide backend topology from the browser.

### Initial API groups

```text
GET  /api/v1/catalog/states
GET  /api/v1/place-history/:state
GET  /api/v1/place-history/:state/:placeId
GET  /api/v1/place-votes?state=tn
POST /api/v1/place-votes
POST /api/v1/place-history-submissions
GET  /api/v1/checklists
GET  /api/v1/checklists/:id
GET  /api/v1/schemes/in
GET  /api/v1/opportunities/in
```

### Standard response envelope

```json
{
  "data": {},
  "meta": {
    "requestId": "...",
    "version": "v1",
    "generatedAt": "2026-07-26T00:00:00Z"
  },
  "error": null
}
```

For errors:

```json
{
  "data": null,
  "meta": {
    "requestId": "...",
    "version": "v1"
  },
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request could not be accepted.",
    "fields": {}
  }
}
```

### Contract rules

- Version all public endpoints.
- Validate inputs at the boundary and again in the domain layer.
- Use stable IDs, not display names, as database keys.
- Include state codes in place IDs or use a composite key.
- Treat legends, oral traditions and disputed etymologies as explicit evidence categories.
- Never let frontend code construct SQL or persistence-specific filters.
- Generate OpenAPI and JSON Schema from the contracts package when practical.

---

## 6. Data ownership

| Data | Authority | Delivery copy |
|---|---|---|
| Curated checklist definitions | Git-reviewed files in `checklist` | KV/static JSON |
| Place-history editorial records | Git-reviewed files initially; database later | KV/static JSON |
| Votes and voter receipts | D1 | cached aggregate where useful |
| User submissions | D1 or primary database | admin views only |
| Media binaries | R2 | Cloudflare CDN |
| Source verification results | `checklist` job output | Git PR or database |
| Public opportunities/schemes snapshots | `checklist` curated output | KV/static JSON |
| Admin users and credentials | identity provider / backend database | never copied to frontend |

### Curated-data publication flow

```text
Research/import job
      -> draft record
      -> validation
      -> editorial review
      -> Git PR or approval action
      -> published catalog snapshot
      -> KV/static artifact
      -> frontend cache invalidation
```

The initial phase should preserve Git review as the publication gate for factual content.

---

## 7. Security model

### Public frontend

- Strict Content Security Policy introduced gradually in report-only mode.
- No backend secrets embedded in JavaScript.
- Same-origin API calls.
- Sanitized rendering; use text nodes for user content.
- Subresource integrity where third-party scripts cannot be eliminated.
- Explicit caching rules for HTML, immutable assets and API responses.

### Public write APIs

- Origin validation.
- Request body and field-size limits.
- Schema validation and normalization.
- Idempotency keys where retries are possible.
- Rate limiting by privacy-preserving fingerprint and endpoint.
- Bot controls appropriate to traffic level.
- Parameterized database operations.
- Queue external notifications rather than sending them inline.

### Backend/admin

- Authentication using an identity provider or signed service token.
- Role separation: viewer, editor and publisher.
- Audit events for editorial mutations.
- Secret rotation and environment separation.
- Preview environments must not use production write credentials.

### Service-to-service authentication

Cloudflare-to-Vercel calls should include:

- A short-lived signed token or HMAC request signature.
- Timestamp and replay window.
- Request ID.
- Body digest for write requests.

Vercel must verify the signature before executing internal operations.

---

## 8. Caching and performance

### Frontend assets

- Content-hashed JS/CSS/images: `public, max-age=31536000, immutable`.
- HTML: revalidate or short edge TTL, depending on publishing frequency.
- Service worker: no long immutable caching.
- Avoid query-string cache busting for every request; use build hashes.

### Public catalog APIs

- Produce versioned or ETag-enabled responses.
- Cache public read-only snapshots at the edge.
- Use stale-while-revalidate for catalogs that tolerate brief staleness.
- Do not cache personalized or voter-specific responses as shared responses.

### Vote APIs

- `POST`: `no-store`.
- Voter-specific `GET`: `private, no-store`.
- Public aggregate-only endpoint may use a very short edge TTL if separated from voter state.

### Cross-platform calls

- Do not call Vercel during initial page rendering when a snapshot can be served from Cloudflare.
- Run heavy refresh work asynchronously and publish the result back to Cloudflare.
- Choose the Vercel function region close to its primary database or external dependency.

---

## 9. Observability

Use a shared request ID across Cloudflare, Vercel and asynchronous jobs.

### Required fields

```text
requestId
service
route
method
status
latencyMs
environment
deploymentId
userAgentClass
errorCode
```

Do not log raw voter tokens, authorization headers, sensitive submissions or unnecessary IP data.

### Minimum operational views

- Frontend availability and core web vitals.
- API success rate by route.
- D1 errors and migration version.
- Queue backlog and retry/dead-letter counts.
- Vercel function duration, errors and cold-start indicators.
- Catalog freshness and last successful verification.
- Synthetic checks for important routes such as vote GET/POST.

---

## 10. Deployment and environments

Use three logical environments:

```text
local
preview
production
```

### Frontend pipeline

1. Lint and unit tests.
2. Build static assets.
3. Validate links and route manifests.
4. Run frontend contract tests against mock/backend preview.
5. Deploy Cloudflare preview.
6. Run smoke tests.
7. Deploy production after approval/merge.

### Backend pipeline

1. Lint, unit and schema tests.
2. Validate curated datasets.
3. Run migration checks.
4. Deploy Cloudflare backend preview components.
5. Deploy Vercel preview.
6. Run shared contract and integration tests.
7. Promote to production.

### Migration safety

- Migrations live in `checklist`.
- Each migration is immutable after production application.
- CI verifies pending migrations.
- Production deployment checks that required bindings and database versions exist.
- Backend code must tolerate a rolling deployment where feasible.

---

## 11. Migration phases

## Phase 0 — Stabilize current production

- Merge the region-hiding revert.
- Restore successful Cloudflare deployment.
- Confirm `/api/place-votes/` no longer returns 404.
- Document the existing Pages/Workers project settings and D1 bindings.
- Add a production smoke test for critical routes.

**Exit criteria:** frontend and current vote/submission flows are deployable and observable.

## Phase 1 — Establish contracts and repo boundaries

- Create `packages/contracts` and `packages/domain` in `checklist`.
- Define place-history, vote, submission, scheme and opportunity schemas.
- Create a typed API client in `share-capsule`.
- Preserve current URLs through adapters.
- Add contract tests shared by both repositories.

**Exit criteria:** frontend does not directly depend on D1 schema or backend implementation.

## Phase 2 — Move voting backend first

Voting is the smallest useful vertical slice and currently exposes deployment fragility.

- Move vote domain logic and D1 migration ownership to `checklist`.
- Create `apps/cloudflare-api` route handlers.
- Deploy the Worker independently from the frontend asset build.
- Route `/api/v1/place-votes` through the frontend facade.
- Keep `/api/place-votes/` as a temporary compatibility route.
- Add end-to-end tests for GET, first vote, duplicate vote and invalid token.

**Exit criteria:** frontend deployment failure cannot remove the voting API.

## Phase 3 — Move submissions and notifications

- Move validation, persistence and rate-limiting logic to `checklist`.
- Store accepted submissions in D1.
- Push notification work to a Cloudflare Queue.
- Use a Vercel function for complex email formatting or editorial integrations if needed.
- Add an admin read API with authentication.

**Exit criteria:** submissions are durable even if downstream email/integration services fail.

## Phase 4 — Convert catalogs to backend-owned artifacts

- Move place-history source records to `checklist/data/place-history/<state>`.
- Add validation for state code, evidence type, source URL and reviewed date.
- Generate static JSON/KV snapshots during backend CI.
- Make `share-capsule` render state pages from the public catalog API or generated artifact.
- Preserve state routes such as `/name/history/tn/` and `/name/history/ap/`.

**Exit criteria:** adding a state or place does not require copying backend logic into frontend files.

## Phase 5 — Move schemes and public opportunities

- Standardize source and listing schemas.
- Implement scheduled source-health and freshness checks.
- Publish only reviewed records.
- Serve snapshots from Cloudflare.
- Run heavier collection/normalization on Vercel.

**Exit criteria:** public pages remain fast while verification jobs run independently.

## Phase 6 — Frontend structural refactor

- Group pages by features.
- Replace globally injected scripts with explicit feature entry points.
- Introduce a build manifest and content-hashed assets.
- Reduce service-worker scope and make caching predictable.
- Add accessibility, visual-regression and performance budgets.

**Exit criteria:** frontend code has a predictable build, route ownership and test model.

## Phase 7 — Administration and editorial workflow

- Build authenticated editorial APIs in `checklist`.
- Add draft/review/publish states.
- Track evidence confidence, reviewer and timestamps.
- Generate PRs or publish snapshots through an approved workflow.

**Exit criteria:** factual data changes are auditable and do not require editing minified frontend JavaScript.

---

## 12. Testing strategy

### Contract tests

Run the same request/response fixtures against:

- Cloudflare Worker handlers.
- Vercel Functions.
- Frontend mock server.

### Backend tests

- Domain unit tests without platform APIs.
- Persistence adapter integration tests.
- D1 migration tests against a temporary database.
- Queue retry and idempotency tests.
- Authentication and signature verification tests.

### Frontend tests

- Rendering with loading, success, empty and error responses.
- Keyboard and screen-reader behavior.
- Search and language switching.
- Offline and service-worker upgrade behavior.
- Mobile performance for India and other target regions.

### Production smoke tests

At minimum:

```text
GET  /
GET  /name/history/tn/
GET  /name/history/ap/
GET  /api/v1/place-votes?state=tn
POST /api/v1/place-votes using a synthetic test place or isolated test environment
```

A 404 on a required API route must fail deployment promotion.

---

## 13. Immediate backlog

### P0

- Restore Cloudflare production build and vote API.
- Merge PR that removes location-based hiding.
- Record Cloudflare project root, build output and bindings.
- Add API-route smoke checks.

### P1

- Add backend monorepo folders to `checklist`.
- Define v1 contracts.
- Extract voting logic and migrations.
- Create independent Cloudflare Worker deployment for backend routes.
- Introduce a same-origin API facade in `share-capsule`.

### P2

- Extract submissions.
- Add Queue-based notifications.
- Move place-history data to backend-owned validated records.
- Generate the state directory from backend metadata.

### P3

- Add Vercel enrichment/job service.
- Add editorial authentication and audit trail.
- Refactor frontend scripts into feature modules.

---

## 14. Decision rules for new features

Before implementing a new feature, answer these questions:

1. Is it presentation or browser interaction? Put it in `share-capsule`.
2. Is it a business rule, validation rule, persistence operation or scheduled job? Put it in `checklist`.
3. Can the response be generated ahead of time? Publish a static or KV snapshot on Cloudflare.
4. Does it need a low-latency global mutation against D1/KV/R2? Use a Cloudflare Worker.
5. Does it need Node/Python libraries, AI orchestration or heavier processing? Use a Vercel Function.
6. Does the browser need to know which provider serves it? Usually no; route through the same-origin facade.
7. Would failure of the frontend deployment remove a critical API? If yes, the deployment boundary is wrong.

---

## 15. Definition of done for the refactor

The refactor is complete when:

- `share-capsule` can deploy or roll back without changing backend availability.
- `checklist` owns all server-side domain rules and migrations.
- Cloudflare and Vercel services deploy independently.
- Public APIs are versioned and contract-tested.
- Catalog publication is reviewed and auditable.
- Critical API routes have production smoke checks.
- Static pages remain fast and cacheable globally.
- Heavy jobs do not delay visitor requests.
- Secrets and admin behavior are absent from the frontend repository.
- Each feature has a documented owner, platform and rollback path.

---

## 16. Official platform references

- Cloudflare Workers static assets: https://developers.cloudflare.com/workers/static-assets/
- Cloudflare static asset bindings: https://developers.cloudflare.com/workers/static-assets/binding/
- Cloudflare D1: https://developers.cloudflare.com/d1/
- Cloudflare R2: https://developers.cloudflare.com/r2/
- Cloudflare KV: https://developers.cloudflare.com/kv/
- Cloudflare Queues: https://developers.cloudflare.com/queues/
- Cloudflare Cron Triggers: https://developers.cloudflare.com/workers/configuration/cron-triggers/
- Cloudflare Service Bindings: https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/
- Vercel Functions: https://vercel.com/docs/functions
- Vercel Fluid compute: https://vercel.com/docs/fluid-compute
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
- Vercel CDN cache: https://vercel.com/docs/caching/cdn-cache
- Vercel Cache-Control: https://vercel.com/docs/caching/cache-control-headers
