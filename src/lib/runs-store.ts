/**
 * In-memory storage for runs (development only)
 * In production, this would be replaced with DynamoDB
 * 
 * Uses globalThis to persist across HMR (Hot Module Reloading) in development
 */

// Persist runs across HMR by storing in global scope
declare global {
  // eslint-disable-next-line no-var
  var __runs_store: Record<string, any[]> | undefined;
}

if (!global.__runs_store) {
  global.__runs_store = {};
}

export const runsStore: Record<string, any[]> = global.__runs_store;


