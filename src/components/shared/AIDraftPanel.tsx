'use client'

/**
 * AIDraftPanel Component
 *
 * Dedicated drafting interface for client communications.
 * Includes scope checking ("The Lawyer") and draft generation.
 */

import { useState, useCallback } from 'react'
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Mail,
  ClipboardList,
  Heart,
  Scale,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ScopeWarning } from './ScopeWarning'
import { AIConstraintWarnings, parseWarnings } from './AIConstraintWarnings'
import { cn } from '@/lib/utils'

interface AIDraftPanelProps {
  clientId: string
  clientName: string
  defaultDraftType?: string
  triggerClassName?: string
}

const DRAFT_TYPES = [
  {
    value: 'CLIENT_EMAIL',
    label: 'Client Email',
    icon: Mail,
    description: 'Professional email to client',
  },
  {
    value: 'STATUS_UPDATE',
    label: 'Status Update',
    icon: ClipboardList,
    description: 'Progress report or update',
  },
  {
    value: 'RETENTION_OUTREACH',
    label: 'Retention Outreach',
    icon: Heart,
    description: 'Re-engagement message',
  },
  {
    value: 'SCOPE_NEGOTIATION',
    label: 'Scope Discussion',
    icon: Scale,
    description: 'Service tier conversation',
  },
]

// Common services that might be promised in drafts
const COMMON_SERVICES = [
  { id: 'technical_audit', label: 'Technical SEO Audit' },
  { id: 'content_strategy', label: 'Content Strategy' },
  { id: 'link_building', label: 'Link Building' },
  { id: 'local_seo', label: 'Local SEO' },
  { id: 'competitor_analysis', label: 'Competitor Analysis' },
  { id: 'keyword_research', label: 'Keyword Research' },
  { id: 'on_page_optimization', label: 'On-Page Optimization' },
  { id: 'reporting', label: 'Performance Reporting' },
]

interface DraftResponse {
  draft: string
  warnings: string[]
  scopeViolations: string[]
  clientTier: string | null
  dataQuality: {
    daysOfData?: number
    hasMinimum?: boolean
    cacheAgeHours?: number
    isStale?: boolean
  }
}

export function AIDraftPanel({
  clientId,
  clientName,
  defaultDraftType = 'CLIENT_EMAIL',
  triggerClassName,
}: AIDraftPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draftType, setDraftType] = useState(defaultDraftType)
  const [context, setContext] = useState('')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<DraftResponse | null>(null)
  const [editedDraft, setEditedDraft] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = useCallback(async () => {
    if (!context.trim()) {
      setError('Please provide context for the draft')
      return
    }

    setIsLoading(true)
    setError(null)
    setResponse(null)

    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          draftType,
          context: context.trim(),
          requestedWork: selectedServices,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate draft')
      }

      const data = await res.json()
      setResponse(data)
      setEditedDraft(data.draft)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate draft')
    } finally {
      setIsLoading(false)
    }
  }, [clientId, draftType, context, selectedServices])

  const handleRegenerate = useCallback(async () => {
    await handleGenerate()
  }, [handleGenerate])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(editedDraft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [editedDraft])

  const handleServiceToggle = useCallback((serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((s) => s !== serviceId)
        : [...prev, serviceId]
    )
  }, [])

  const resetForm = useCallback(() => {
    setContext('')
    setSelectedServices([])
    setResponse(null)
    setEditedDraft('')
    setError(null)
  }, [])

  const selectedDraftType = DRAFT_TYPES.find((t) => t.value === draftType)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className={triggerClassName}>
          <FileText className="w-4 h-4 mr-1" />
          Draft Email
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[500px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Draft Generator
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Drafting for <span className="font-medium">{clientName}</span>
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Draft Type Selection */}
            <div className="space-y-2">
              <Label>Draft Type</Label>
              <Select value={draftType} onValueChange={setDraftType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DRAFT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        <div>
                          <p className="font-medium">{type.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Context Input */}
            <div className="space-y-2">
              <Label>Situation / Context</Label>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Describe the situation, what you want to communicate, any specific points to address..."
                className="min-h-[120px]"
              />
            </div>

            {/* Services Checklist (for scope checking) */}
            <div className="space-y-2">
              <Label>Work Being Promised (Scope Check)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select any services you&apos;re committing to in this communication.
                The system will check if they&apos;re in scope.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {COMMON_SERVICES.map((service) => (
                  <div key={service.id} className="flex items-center gap-2">
                    <Checkbox
                      id={service.id}
                      checked={selectedServices.includes(service.id)}
                      onCheckedChange={() => handleServiceToggle(service.id)}
                    />
                    <Label
                      htmlFor={service.id}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {service.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !context.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Draft
                </>
              )}
            </Button>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Response Section */}
            {response && (
              <div className="space-y-4">
                {/* Scope Violations */}
                {response.scopeViolations.length > 0 && (
                  <ScopeWarning
                    violations={response.scopeViolations}
                    clientTier={response.clientTier}
                    onEditDraft={() => {
                      // Scroll to draft area
                      document.getElementById('draft-output')?.focus()
                    }}
                    onProceedAnyway={() => {
                      // User acknowledges and proceeds
                    }}
                  />
                )}

                {/* Other Warnings */}
                {response.warnings.length > 0 &&
                  response.scopeViolations.length === 0 && (
                    <AIConstraintWarnings
                      warnings={parseWarnings(response.warnings)}
                    />
                  )}

                {/* Draft Output */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Generated Draft</Label>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRegenerate}
                        disabled={isLoading}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Regenerate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    id="draft-output"
                    value={editedDraft}
                    onChange={(e) => setEditedDraft(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                  />
                </div>

                {/* Data Quality Info */}
                {response.dataQuality && (
                  <div className="text-xs text-muted-foreground space-y-1 p-2 bg-muted rounded">
                    <p>
                      Data quality: {response.dataQuality.daysOfData || 'N/A'} days
                      {response.dataQuality.hasMinimum === false && ' (below minimum)'}
                    </p>
                    {response.dataQuality.isStale && (
                      <p className="text-amber-600">
                        Data is {response.dataQuality.cacheAgeHours}h old (stale)
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleCopy}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy to Clipboard
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={resetForm}
                  >
                    Start Over
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
