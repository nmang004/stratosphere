'use client';

/**
 * Stratosphere Forensics Console
 *
 * Main page - Ticket Command Center for analyzing AM support tickets.
 */

import { useState } from 'react';
import { TicketInputPanel } from '@/components/forensics/TicketInputPanel';
import { ResultsPanel } from '@/components/forensics/ResultsPanel';
import type { AnalyzeTicketRequest, AnalyzeTicketResponse, AMPersona } from '@/lib/ai/types';

export default function ForensicsConsolePage() {
  const [result, setResult] = useState<AnalyzeTicketResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPersona, setCurrentPersona] = useState<AMPersona>('PANIC_PATTY');

  const handleSubmit = async (request: AnalyzeTicketRequest) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setCurrentPersona(request.amPersona);

    try {
      const response = await fetch('/api/ai/analyze-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze ticket');
      }

      const data: AnalyzeTicketResponse = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Forensics Console
        </h1>
        <p className="text-muted-foreground">
          Analyze AM tickets and generate strategic responses using the Ranking 2.0 Handbook.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Main Content - Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
        {/* Left Panel - Input */}
        <div className="overflow-auto">
          <TicketInputPanel onSubmit={handleSubmit} isLoading={isLoading} />
        </div>

        {/* Right Panel - Results */}
        <div className="overflow-auto">
          <ResultsPanel result={result} persona={currentPersona} />
        </div>
      </div>
    </div>
  );
}
