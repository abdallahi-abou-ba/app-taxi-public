-- Backfill: give existing drivers/completed rides a real commission figure
-- (default 20%) instead of leaving the new columns null, so the admin
-- dashboard/revenue views aren't zero for pre-existing data.
UPDATE "users" SET "commissionRate" = 0.20 WHERE role = 'DRIVER' AND "commissionRate" IS NULL;

UPDATE "rides"
SET "commissionRateSnapshot" = 0.20,
    "commissionAmount" = ROUND((COALESCE("estimatedFare", 0) * 0.20)::numeric, 2)::float,
    "driverNetAmount"  = ROUND((COALESCE("estimatedFare", 0) * 0.80)::numeric, 2)::float
WHERE status = 'COMPLETED' AND "commissionRateSnapshot" IS NULL;
