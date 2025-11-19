# Fix: Podcasts Not Showing Up

## Problem
After signing in, no podcasts are visible in the dashboard, even though podcasts exist in DynamoDB.

## Root Cause
1. **Old podcasts format**: Existing podcasts in DynamoDB don't have `orgId` field (legacy format)
2. **API query by orgId**: The list API queries by `orgId` using the `OrgIdIndex` GSI
3. **GSI is empty**: The GSI has 0 items because old podcasts don't have `orgId`
4. **Result**: API returns empty list even though podcasts exist

## Solution
Updated `src/api/podcasts/list.ts` to:
1. First try to query by `orgId` (new format)
2. If no results AND user is a legacy user (no `custom:org_id` in token):
   - Fall back to scanning for podcasts without `orgId` (legacy format)
   - This provides backward compatibility

## Changes Made
- Added `ScanCommand` import
- Added fallback logic to scan for legacy podcasts
- Handles both new format (with orgId) and old format (without orgId)

## Testing
After deploying this fix:
1. Sign in to the app
2. Podcasts should now appear (both new and legacy)
3. New podcasts created will have `orgId` and use the efficient query
4. Old podcasts will still be accessible via the scan fallback

## Next Steps
1. Deploy the updated Lambda function
2. Test that podcasts appear after sign in
3. Consider migrating old podcasts to include `orgId` for better performance

