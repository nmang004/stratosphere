/**
 * Inngest Client
 *
 * Initializes the Inngest client for Stratosphere background jobs.
 * Events can be added as new forensics features require background processing.
 */

import { Inngest, EventSchemas } from 'inngest';

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Type definitions for all Inngest events.
 * These ensure type safety when sending and handling events.
 */
type Events = {
  // Forensics Events (placeholder for future background jobs)
  'forensics/cache.cleanup': {
    data: Record<string, never>;
  };
};

// =============================================================================
// INNGEST CLIENT
// =============================================================================

/**
 * Inngest client instance for Stratosphere.
 * Use this to send events and create functions.
 */
export const inngest = new Inngest({
  id: 'stratosphere',
  schemas: new EventSchemas().fromRecord<Events>(),
});

// Export event types for use in other files
export type { Events };
