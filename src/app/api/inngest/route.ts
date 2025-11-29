/**
 * Inngest Webhook Route
 *
 * This route handles all Inngest events and function invocations.
 * Currently minimal as most background jobs were removed in the Forensics pivot.
 *
 * For local development:
 * 1. Run `npx inngest-cli dev` in a separate terminal
 * 2. Access Inngest dev UI at http://localhost:8288
 */

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';

// Export the Inngest serve handler for all HTTP methods
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Add forensics-related background jobs here as needed
  ],
});
