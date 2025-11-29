'use client';

/**
 * Verdict Card Component
 *
 * Displays the AI's verdict and analysis summary.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  TrendingDown,
  Users,
  Lock,
} from 'lucide-react';
import type { VerdictType, NineMonthCheck } from '@/lib/ai/types';
import { VERDICT_LABELS, VERDICT_DESCRIPTIONS } from '@/lib/ai/types';

interface VerdictCardProps {
  verdict: VerdictType;
  rootCause: string;
  strategy: string | null;
  confidence: number;
  evidence: string[];
  nineMonthCheck?: NineMonthCheck;
}

const verdictConfig: Record<VerdictType, {
  icon: typeof CheckCircle;
  color: string;
  bgColor: string;
}> = {
  FALSE_ALARM: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  TECHNICAL_FAILURE: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  COMPETITOR_WIN: {
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  ALGO_IMPACT: {
    icon: TrendingDown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  CANNIBALIZATION: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  NEEDS_INVESTIGATION: {
    icon: HelpCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
};

export function VerdictCard({
  verdict,
  rootCause,
  strategy,
  confidence,
  evidence,
  nineMonthCheck,
}: VerdictCardProps) {
  const config = verdictConfig[verdict];
  const Icon = config.icon;
  const confidencePercent = Math.round(confidence * 100);

  return (
    <div className="space-y-4">
      {/* Main Verdict */}
      <Card className={config.bgColor}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`h-6 w-6 ${config.color}`} />
              <CardTitle className={config.color}>
                {VERDICT_LABELS[verdict]}
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-sm">
              {confidencePercent}% Confidence
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {VERDICT_DESCRIPTIONS[verdict]}
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Confidence</span>
              <span className="font-medium">{confidencePercent}%</span>
            </div>
            <Progress value={confidencePercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Root Cause */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Root Cause</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{rootCause}</p>
        </CardContent>
      </Card>

      {/* Strategy */}
      {strategy && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recommended Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="text-sm">
              {strategy}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* 9-Month Rule Status */}
      {nineMonthCheck && (
        <Card className={nineMonthCheck.isLocked ? 'border-amber-200' : 'border-green-200'}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Lock className={`h-4 w-4 ${nineMonthCheck.isLocked ? 'text-amber-500' : 'text-green-500'}`} />
              <CardTitle className="text-base">9-Month Rule</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant={nineMonthCheck.isLocked ? 'destructive' : 'default'}>
              {nineMonthCheck.isLocked ? 'LOCKED' : 'ELIGIBLE'}
            </Badge>
            <p className="text-sm text-muted-foreground mt-2">
              {nineMonthCheck.reason}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Evidence */}
      {evidence.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Supporting Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {evidence.map((item, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
