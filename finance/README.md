# Private Finance Planner

Privacy-first personal finance workspace for ShareCapsule.

## Current tools

- encrypted local vault
- monthly income / expense / cash-flow dashboard
- transaction entry
- local CSV transaction import
- monthly category budgets
- asset tracking and net worth
- debt balances, APRs, minimums, and avalanche ordering
- savings goals and estimated time to target
- cash-reserve runway
- 12-month cash projection
- transparent rule-based financial action plan
- encrypted backup / restore
- automatic inactivity lock
- local erase control

## Local-only architecture

The application does not have a finance backend. It does not send financial data to ShareCapsule or a third party.

```text
User input / local CSV
        |
        v
Browser memory ----> local calculations / planner rules
        |
        v
Web Crypto AES-GCM
        |
        v
Encrypted IndexedDB vault on the user's device
```

No plaintext financial data is intentionally persisted.

See `SECURITY.md` before production deployment.

## CSV import format

The first row must contain these column names:

```csv
date,description,amount,category,type
2026-08-01,Payroll,5000,Income,income
2026-08-02,Rent,2200,Housing,expense
```

Required columns:

- `date` — `YYYY-MM-DD`
- `description`
- `amount`
- `category`

Optional:

- `type` — `income` or `expense`

If `type` is omitted, negative amounts are treated as expenses and positive amounts as income. Because bank CSV conventions differ, imported classifications should always be reviewed.

## Production URL

The finance application is deployed on the dedicated production origin:

`https://finance.sharecapsule.org/`

The dedicated origin should use the response headers and origin-isolation controls listed in `SECURITY.md`.
