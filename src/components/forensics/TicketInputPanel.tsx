'use client';

/**
 * Ticket Input Panel Component
 *
 * Left panel of the Forensics Console.
 * Accepts ticket body, domain, and AM persona selection.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Loader2 } from 'lucide-react';
import type { AMPersona, AnalyzeTicketRequest } from '@/lib/ai/types';
import { AM_PERSONA_LABELS, AM_PERSONA_DESCRIPTIONS } from '@/lib/ai/types';

interface TicketInputPanelProps {
  onSubmit: (request: AnalyzeTicketRequest) => void;
  isLoading: boolean;
}

export function TicketInputPanel({ onSubmit, isLoading }: TicketInputPanelProps) {
  const [ticketBody, setTicketBody] = useState('');
  const [targetDomain, setTargetDomain] = useState('');
  const [targetQuery, setTargetQuery] = useState('');
  const [location, setLocation] = useState('');
  const [amPersona, setAmPersona] = useState<AMPersona>('PANIC_PATTY');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!ticketBody.trim() || !targetDomain.trim()) {
      return;
    }

    onSubmit({
      ticketBody: ticketBody.trim(),
      targetDomain: targetDomain.trim(),
      amPersona,
      targetQuery: targetQuery.trim() || undefined,
      location: location.trim() || undefined,
    });
  };

  const personas: AMPersona[] = ['PANIC_PATTY', 'TECHNICAL_TOM', 'GHOST_GARY'];

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Ticket Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ticket Body */}
          <div className="space-y-2">
            <Label htmlFor="ticketBody">Paste Ticket Body</Label>
            <Textarea
              id="ticketBody"
              placeholder="Paste the AM's ticket or email here..."
              value={ticketBody}
              onChange={(e) => setTicketBody(e.target.value)}
              className="min-h-[200px] resize-none"
              required
            />
          </div>

          {/* Target Domain */}
          <div className="space-y-2">
            <Label htmlFor="domain">Target Domain</Label>
            <Input
              id="domain"
              placeholder="example.com"
              value={targetDomain}
              onChange={(e) => setTargetDomain(e.target.value)}
              required
            />
          </div>

          {/* Target Query (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="query">Target Query (Optional)</Label>
            <Input
              id="query"
              placeholder="plumber near me"
              value={targetQuery}
              onChange={(e) => setTargetQuery(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              If the ticket mentions a specific keyword, enter it for live SERP check
            </p>
          </div>

          {/* Location (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              placeholder="Austin, Texas"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* AM Persona */}
          <div className="space-y-2">
            <Label htmlFor="persona">AM Persona</Label>
            <Select
              value={amPersona}
              onValueChange={(value) => setAmPersona(value as AMPersona)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select persona" />
              </SelectTrigger>
              <SelectContent>
                {personas.map((persona) => (
                  <SelectItem key={persona} value={persona}>
                    <div>
                      <div className="font-medium">{AM_PERSONA_LABELS[persona]}</div>
                      <div className="text-xs text-muted-foreground">
                        {AM_PERSONA_DESCRIPTIONS[persona]}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !ticketBody.trim() || !targetDomain.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Analyze Ticket
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
