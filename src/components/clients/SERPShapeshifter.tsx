'use client'

/**
 * SERP Shapeshifter Component
 *
 * Competitive SERP analysis tool for clients.
 * Analyzes competitor titles/metas and generates AI-powered suggestions.
 */

import { useState, useCallback } from 'react'
import {
  Search,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Loader2,
  Lightbulb,
  Target,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  getMockSERPResults,
  psychologicalTriggers,
  type SERPAnalysis,
  type SERPResult,
} from '@/lib/mocks/serpData'
import { cn } from '@/lib/utils'

interface SERPShapeshifterProps {
  clientId: string
  clientName: string
  clientDomain: string
}

interface AISuggestion {
  title: string
  description: string
  triggers: string[]
  reasoning: string
}

export function SERPShapeshifter({
  clientId,
  clientName,
  clientDomain,
}: SERPShapeshifterProps) {
  const [keyword, setKeyword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)
  const [results, setResults] = useState<SERPAnalysis | null>(null)
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copiedType, setCopiedType] = useState<'title' | 'description' | null>(null)

  const handleSearch = useCallback(async () => {
    if (!keyword.trim()) return

    setIsLoading(true)
    setSuggestions([])

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    const serpResults = getMockSERPResults(keyword, clientDomain)
    setResults(serpResults)
    setIsLoading(false)
  }, [keyword, clientDomain])

  const handleGenerateSuggestions = useCallback(async () => {
    if (!results) return

    setIsGeneratingSuggestions(true)

    // Simulate AI generation delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Generate mock AI suggestions based on competitor analysis
    const competitorTitles = results.competitors.map((c) => c.title)
    const competitorDescriptions = results.competitors.map((c) => c.description)

    // Extract common patterns from competitors
    const commonTriggers: string[] = []
    for (const category of Object.values(psychologicalTriggers)) {
      for (const trigger of category) {
        const triggerLower = trigger.toLowerCase()
        if (
          competitorTitles.some((t) => t.toLowerCase().includes(triggerLower)) ||
          competitorDescriptions.some((d) => d.toLowerCase().includes(triggerLower))
        ) {
          commonTriggers.push(trigger)
        }
      }
    }

    // Generate suggestions
    const generatedSuggestions: AISuggestion[] = [
      {
        title: `${keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} | Trusted by 500+ Businesses - ${clientName}`,
        description: `Award-winning ${keyword.toLowerCase()} solutions. See why industry leaders choose us. Free consultation. ROI guarantee. Start today.`,
        triggers: ['Social Proof', 'Authority', 'Risk Reversal'],
        reasoning:
          'Competitors heavily use social proof and authority signals. This title adds credibility while the description addresses risk concerns with a guarantee.',
      },
      {
        title: `Best ${keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} 2024 | Results in 30 Days`,
        description: `Proven ${keyword.toLowerCase()} strategies that deliver measurable results. Join 1000+ satisfied clients. Free strategy session. No long-term contracts.`,
        triggers: ['Urgency', 'Specificity', 'Reciprocity'],
        reasoning:
          'Adding year makes it timely. "30 Days" creates urgency and sets expectations. "No long-term contracts" addresses common objection.',
      },
      {
        title: `${keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Experts | ${clientName}`,
        description: `Transform your business with data-driven ${keyword.toLowerCase()}. Dedicated account team. Transparent pricing. Book your free audit now.`,
        triggers: ['Authority', 'Transparency', 'Reciprocity'],
        reasoning:
          '"Experts" establishes authority. "Transparent pricing" differentiates from competitors who hide costs. "Free audit" provides value upfront.',
      },
    ]

    setSuggestions(generatedSuggestions)
    setIsGeneratingSuggestions(false)
  }, [results, keyword, clientName])

  const handleCopy = useCallback(
    async (text: string, index: number, type: 'title' | 'description') => {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setCopiedType(type)
      setTimeout(() => {
        setCopiedIndex(null)
        setCopiedType(null)
      }, 2000)
    },
    []
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSearch()
      }
    },
    [handleSearch]
  )

  const renderPositionBadge = (position: number) => {
    if (position <= 3) {
      return (
        <Badge variant="default" className="bg-green-500">
          <TrendingUp className="w-3 h-3 mr-1" />
          #{position}
        </Badge>
      )
    }
    if (position <= 10) {
      return (
        <Badge variant="secondary">
          <Minus className="w-3 h-3 mr-1" />
          #{position}
        </Badge>
      )
    }
    return (
      <Badge variant="destructive">
        <TrendingDown className="w-3 h-3 mr-1" />
        #{position}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            SERP Shapeshifter
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Analyze competitor SERP listings and generate AI-powered title/meta suggestions.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter a keyword to analyze..."
                disabled={isLoading}
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading || !keyword.trim()}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-1" />
                  Analyze
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Try: &quot;seo services&quot;, &quot;organic produce delivery&quot;, &quot;sustainable fashion&quot;
          </p>
        </CardContent>
      </Card>

      {/* Results Section */}
      {results && (
        <Tabs defaultValue="analysis" className="space-y-4">
          <TabsList>
            <TabsTrigger value="analysis">SERP Analysis</TabsTrigger>
            <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
          </TabsList>

          {/* SERP Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            {/* Client's Current Result */}
            {results.clientResult && (
              <Card className="border-primary">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      Your Current Listing
                    </CardTitle>
                    {renderPositionBadge(results.clientResult.position)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Title</Label>
                      <p className="text-blue-600 dark:text-blue-400 font-medium">
                        {results.clientResult.title}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <p className="text-sm text-muted-foreground">
                        {results.clientResult.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <ExternalLink className="w-3 h-3" />
                      {results.clientResult.url}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Competitor Results */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Competitors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.competitors.map((competitor, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-4 rounded-lg border bg-muted/30',
                      index === 0 && 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/30'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {renderPositionBadge(competitor.position)}
                        <span className="text-xs text-muted-foreground">
                          {competitor.domain}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                        {competitor.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {competitor.description}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Generate Suggestions CTA */}
            <div className="flex justify-center">
              <Button
                onClick={handleGenerateSuggestions}
                disabled={isGeneratingSuggestions}
                size="lg"
              >
                {isGeneratingSuggestions ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing Competitors...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Suggestions
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* AI Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-4">
            {suggestions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Lightbulb className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>Click &quot;Generate AI Suggestions&quot; to get optimized title and meta suggestions</p>
                </CardContent>
              </Card>
            ) : (
              suggestions.map((suggestion, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="pb-2 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        Suggestion {index + 1}
                      </CardTitle>
                      <div className="flex gap-1">
                        {suggestion.triggers.map((trigger) => (
                          <Badge key={trigger} variant="outline" className="text-xs">
                            {trigger}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {/* Title */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs text-muted-foreground">
                          Suggested Title
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => handleCopy(suggestion.title, index, 'title')}
                        >
                          {copiedIndex === index && copiedType === 'title' ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-blue-600 dark:text-blue-400 font-medium p-2 bg-muted rounded">
                        {suggestion.title}
                      </p>
                    </div>

                    {/* Description */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs text-muted-foreground">
                          Suggested Meta Description
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() =>
                            handleCopy(suggestion.description, index, 'description')
                          }
                        >
                          {copiedIndex === index && copiedType === 'description' ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                        {suggestion.description}
                      </p>
                    </div>

                    <Separator />

                    {/* Reasoning */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Why This Works
                      </Label>
                      <p className="text-sm italic">{suggestion.reasoning}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {suggestions.length > 0 && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleGenerateSuggestions}
                  disabled={isGeneratingSuggestions}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate Suggestions
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
