'use client';

/**
 * Draft Email Panel Component
 *
 * Displays the AI-generated email response with copy functionality.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Mail } from 'lucide-react';
import type { AMPersona } from '@/lib/ai/types';
import { AM_PERSONA_LABELS } from '@/lib/ai/types';

interface DraftEmailPanelProps {
  draftEmail: string;
  persona: AMPersona;
}

export function DraftEmailPanel({ draftEmail, persona }: DraftEmailPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Draft Email</CardTitle>
        </div>
        <Badge variant="outline" className="text-xs">
          Tone: {AM_PERSONA_LABELS[persona]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email Content */}
        <div className="relative">
          <div className="rounded-lg border bg-muted/50 p-4 min-h-[300px] whitespace-pre-wrap text-sm">
            {draftEmail}
          </div>
        </div>

        {/* Copy Button */}
        <Button
          onClick={handleCopy}
          variant={copied ? 'default' : 'outline'}
          className="w-full"
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy to Clipboard
            </>
          )}
        </Button>

        {/* Instructions */}
        <p className="text-xs text-muted-foreground text-center">
          Review and customize before sending. This draft is tailored for {AM_PERSONA_LABELS[persona]}.
        </p>
      </CardContent>
    </Card>
  );
}
