'use client'

/**
 * FloatingAIChat Component
 *
 * A wrapper for AIChatPanel that provides the floating chat button
 * for the global dashboard layout.
 */

import { AIChatPanel } from './AIChatPanel'

export function FloatingAIChat() {
  return <AIChatPanel floating />
}
