## Goal
The Facebook token is now valid and the sync function is fetching data successfully. However, every `ad_breakdown` upsert at the adset/ad level fails with a `23505 duplicate key` error, so daily breakdown rows never get refreshed.

## Root cause
- The unique index `ad_breakdown_unique_idx` is defined on **expressions**:
  `(date, level, COALESCE(campaign_id,''), COALESCE(adset_id,''), COALESCE(ad_id,''))`
- The edge function calls `upsert(..., { onConflict: 'date,level,campaign_id,adset_id,ad_id' })` — plain columns.
- PostgREST cannot match a column list to an expression index, so the upsert degrades to a plain insert and collides with existing rows.

## Plan

1. **Database migration**
   - Drop the expression-based `ad_breakdown_unique_idx`.
   - Recreate it as a plain unique constraint with `NULLS NOT DISTINCT` (Postgres 15+) on
     `(date, level, campaign_id, adset_id, ad_id)`.
   - This preserves the same uniqueness semantics (treating NULL adset/ad as a single key) while exposing a real column-based conflict target.

2. **No edge function code change needed**
   - The existing `onConflict: 'date,level,campaign_id,adset_id,ad_id'` will then resolve correctly and rows will update in place.

3. **Verify**
   - Redeploy is not required (function unchanged), but trigger a sync run and confirm:
     - No more `23505` errors in `sync-facebook-ads` logs.
     - `ad_breakdown` rows for today/yesterday show updated `spend`, `impressions`, etc.
     - Account-level `ad_daily_data` upserts continue to work (they already do).

## Out of scope
- Token rotation (already done).
- Any UI changes — dashboard will start showing fresh data automatically once sync completes.
