# Nagara Spark IDE — Enhancement Plan V2

## Issues Found in V1

1. **Stale `workbookApi.ts`**: Old endpoints (`/api/workbook`, `/api/console/execute`) don't match new DB-backed routes
2. **CSV upload broken**: ImportDatasetDialog calls `workbookApi.uploadCsv` which hits non-existent `/api/workbook/upload-csv`
3. **`save_as_dataset` not wired**: Node flag exists but executor doesn't persist to dataset service
4. **No sample data**: Need NYC taxi parquet + zones CSV for capstone pipeline
5. **No dataset creation from ProjectHomePage**: No upload button on datasets tab
6. **`getApiBase()` was broken**: Fixed — now uses Vite proxy for all origins

## V2 Implementation Plan

### Phase 1: Fix Core Functionality
- [ ] Update `workbookApi.ts` to use new DB-backed endpoints (workbookId-scoped)
- [ ] Fix ImportDatasetDialog CSV upload to use project-scoped endpoint
- [ ] Add CSV upload button to ProjectHomePage datasets tab
- [ ] Wire `save_as_dataset` in execution service

### Phase 2: NYC Taxi Data Pipeline
- [ ] Download NYC taxi sample data (parquet) + taxi_zones.csv
- [ ] Create Playwright E2E test that:
  1. Creates a project "NYC Taxi Analysis"
  2. Creates a workbook "Taxi Data Exploration"
  3. Adds dataset node: Load taxi data
  4. Adds dataset node: Load zones lookup
  5. Adds 7 transform nodes for each capstone question
  6. Connects edges between nodes
  7. Executes each node and verifies results

### The 8 RockTheJVM Capstone Questions
1. Which zones have the most pickups/dropoffs?
2. What are the peak hours for taxi?
3. How are trips distributed by length?
4. What are the peak hours for long/short trips?
5. Top 3 pickup/dropoff zones for long/short trips?
6. How are people paying for rides, long vs short?
7. How is payment type evolving with time?
8. Ride-sharing opportunity (grouping close short trips)
