# DATA_MODEL (TB-EM-001 checkpoint 0)

## Migrations

| Migration | Effect |
|---|---|
| `20261020143505_tb_em_000_feasibility_probe` | Created `feasibility_probe` (TB-EM-000 gate) |
| `20261020190000_tb_em_001_retire_feasibility_probe` | Drops `feasibility_probe`; creates `schema_info` and inserts the row `('checkpoint', 'TB-EM-001-cp0')` |

## schema_info (Prisma model `SchemaInfo`)

| Column | Type | Constraint |
|---|---|---|
| key | varchar(64) | PK |
| value | varchar(128) | not null |
| updated_at | timestamptz(3) | not null, default now() |

This is a non-domain placeholder. It exists only because Prisma cannot generate a client for a schema with zero models. It holds no personal or clinical data. `GET /api/health` reports it as `schemaCheckpoint`.

**PLANNED:** drop it when checkpoint A adds the identity models (see `docs/emergent/workunits/TB-EM-001.md` §4). Every Phase 1 entity is still **PLANNED**.
