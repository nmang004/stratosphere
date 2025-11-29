'use client';

/**
 * Results Panel Component
 *
 * Right panel of the Forensics Console.
 * Displays analysis results in tabs: Verdict, Evidence, Draft Email.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Clock } from 'lucide-react';
import { VerdictCard } from './VerdictCard';
import { DraftEmailPanel } from './DraftEmailPanel';
import type { AnalyzeTicketResponse, AMPersona } from '@/lib/ai/types';

interface ResultsPanelProps {
  result: AnalyzeTicketResponse | null;
  persona: AMPersona;
}

export function ResultsPanel({ result, persona }: ResultsPanelProps) {
  if (!result) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center py-12">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium">No Analysis Yet</p>
            <p className="text-sm mt-2">
              Enter ticket details and click &quot;Analyze Ticket&quot; to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full space-y-4">
      {/* Warnings */}
      {result.warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside text-sm">
              {result.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{result.latencyMs}ms</span>
        </div>
        <Badge variant="outline">{result.modelUsed}</Badge>
      </div>

      {/* Tabbed Results */}
      <Tabs defaultValue="verdict" className="flex-1">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="verdict">Verdict</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="email">Draft Email</TabsTrigger>
        </TabsList>

        <TabsContent value="verdict" className="mt-4">
          <VerdictCard
            verdict={result.verdict}
            rootCause={result.rootCause}
            strategy={result.strategy}
            confidence={result.confidence}
            evidence={result.evidence}
            nineMonthCheck={result.nineMonthCheck}
          />
        </TabsContent>

        <TabsContent value="evidence" className="mt-4">
          <EvidencePanel forensicData={result.forensicData} />
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <DraftEmailPanel draftEmail={result.draftEmail} persona={persona} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =============================================================================
// EVIDENCE PANEL SUB-COMPONENT
// =============================================================================

interface EvidencePanelProps {
  forensicData: AnalyzeTicketResponse['forensicData'];
}

function EvidencePanel({ forensicData }: EvidencePanelProps) {
  const hasMarketCheck = !!forensicData.marketCheck;
  const hasAlgoUpdates = !!forensicData.algoOverlay?.updatesInRange?.length;

  return (
    <div className="space-y-4">
      {/* Market Check Results */}
      {hasMarketCheck && forensicData.marketCheck && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Live SERP Check</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Query:</span>
                <span className="font-medium">{forensicData.marketCheck.query}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ranking:</span>
                <Badge variant={forensicData.marketCheck.results.isRanking ? 'default' : 'destructive'}>
                  {forensicData.marketCheck.results.isRanking
                    ? `Position ${forensicData.marketCheck.results.position}`
                    : 'Not Ranking'}
                </Badge>
              </div>
              {forensicData.marketCheck.results.serpFeatures.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {forensicData.marketCheck.results.serpFeatures.map((feature) => (
                    <Badge key={feature} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              )}
              {forensicData.marketCheck.results.topCompetitors.length > 0 && (
                <div className="mt-3">
                  <p className="text-muted-foreground mb-1">Top Competitors:</p>
                  <ol className="list-decimal list-inside text-xs">
                    {forensicData.marketCheck.results.topCompetitors.slice(0, 5).map((comp, i) => (
                      <li key={i}>
                        {comp.domain} (#{comp.position})
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Algorithm Updates */}
      {hasAlgoUpdates && forensicData.algoOverlay && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Algorithm Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {forensicData.algoOverlay.updatesInRange.map((update, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{update.name}</p>
                    <p className="text-xs text-muted-foreground">{update.date}</p>
                  </div>
                  <Badge
                    variant={
                      update.impactLevel === 'HIGH'
                        ? 'destructive'
                        : update.impactLevel === 'MEDIUM'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {update.impactLevel}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Evidence */}
      {!hasMarketCheck && !hasAlgoUpdates && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No forensic evidence available.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adding a target query to enable live SERP checks.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
