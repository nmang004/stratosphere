'use client'

/**
 * AIChatPanel Component
 *
 * Floating chat interface for AI assistance.
 * Supports streaming responses, client context, and conversation history.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  MessageSquare,
  Send,
  Copy,
  Check,
  Bot,
  User,
  Loader2,
  Sparkles,
  Plus,
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
import { AIConstraintWarnings, parseWarnings } from './AIConstraintWarnings'
import { ChatHistory } from './ChatHistory'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

// Rotating thinking messages
const THINKING_MESSAGES = [
  'Thinking...',
  'Analyzing data...',
  'Brainstorming...',
  'Reviewing metrics...',
  'Formulating insights...',
  'Crafting recommendations...',
  'Almost there...',
]

interface AIChatPanelProps {
  clientId?: string
  clientName?: string
  defaultInteractionType?: string
  triggerClassName?: string
  floating?: boolean
}

const INTERACTION_TYPES = [
  { value: 'ANALYSIS', label: 'Analysis' },
  { value: 'ALERT_TRIAGE', label: 'Alert Triage' },
  { value: 'BRIEFING', label: 'Briefing' },
  { value: 'REPORT', label: 'Report Help' },
]

export function AIChatPanel({
  clientId,
  clientName,
  defaultInteractionType = 'ANALYSIS',
  triggerClassName,
  floating = true,
}: AIChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [interactionType, setInteractionType] = useState(defaultInteractionType)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [thinkingIndex, setThinkingIndex] = useState(0)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversationTitle, setConversationTitle] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Create a new conversation
  const createConversation = useCallback(async (title: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          title,
          interactionType,
        }),
      })

      if (!response.ok) throw new Error('Failed to create conversation')

      const data = await response.json()
      return data.conversation.id
    } catch (err) {
      console.error('[AIChatPanel] Failed to create conversation:', err)
      return null
    }
  }, [clientId, interactionType])

  // Save a message to the conversation
  const saveMessage = useCallback(async (convId: string, role: 'user' | 'assistant', content: string) => {
    try {
      await fetch(`/api/ai/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content }),
      })
    } catch (err) {
      console.error('[AIChatPanel] Failed to save message:', err)
    }
  }, [])

  // Load a conversation from history
  const loadConversation = useCallback(async (convId: string) => {
    try {
      const response = await fetch(`/api/ai/conversations/${convId}`)
      if (!response.ok) throw new Error('Failed to load conversation')

      const data = await response.json()
      const conv = data.conversation

      // Convert database messages to local format
      const loadedMessages: Message[] = (conv.messages || [])
        .filter((m: ConversationMessage) => m.role !== 'system')
        .map((m: ConversationMessage) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))

      setConversationId(convId)
      setConversationTitle(conv.title)
      setMessages(loadedMessages)
      setError(null)
    } catch (err) {
      console.error('[AIChatPanel] Failed to load conversation:', err)
      setError('Failed to load conversation')
    }
  }, [])

  // Start a new conversation
  const startNewConversation = useCallback(() => {
    setConversationId(null)
    setConversationTitle(null)
    setMessages([])
    setError(null)
    setInput('')
  }, [])

  // Rotate thinking messages while loading
  useEffect(() => {
    if (!isLoading) {
      setThinkingIndex(0)
      return
    }

    const interval = setInterval(() => {
      setThinkingIndex((prev) => (prev + 1) % THINKING_MESSAGES.length)
    }, 2000) // Change message every 2 seconds

    return () => clearInterval(interval)
  }, [isLoading])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    // Create conversation on first message if needed
    let activeConversationId = conversationId
    if (!activeConversationId) {
      // Use first 50 chars of message as title
      const title = userMessage.content.substring(0, 50) + (userMessage.content.length > 50 ? '...' : '')
      activeConversationId = await createConversation(title)
      if (activeConversationId) {
        setConversationId(activeConversationId)
        setConversationTitle(title)
      }
    }

    // Save user message to database
    if (activeConversationId) {
      saveMessage(activeConversationId, 'user', userMessage.content)
    }

    try {
      // Debug: log what we're sending
      console.log('[AIChatPanel] Sending request with clientId:', clientId)

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          clientId,
          interactionType,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      // Extract warnings from headers
      const warningsHeader = response.headers.get('X-AI-Warnings')
      if (warningsHeader) {
        try {
          const parsedWarnings = JSON.parse(warningsHeader)
          setWarnings(parsedWarnings)
          setTimeout(() => setWarnings([]), 5000)
        } catch {
          // Ignore parse errors
        }
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to get response')
      }

      // Read the streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      }
      setMessages(prev => [...prev, assistantMessage])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          assistantContent += chunk

          // Update the assistant message content
          setMessages(prev => {
            const updated = [...prev]
            const lastMessage = updated[updated.length - 1]
            if (lastMessage.role === 'assistant') {
              lastMessage.content = assistantContent
            }
            return updated
          })
        }
      }

      // Save assistant message to database after streaming completes
      if (activeConversationId && assistantContent) {
        saveMessage(activeConversationId, 'assistant', assistantContent)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, clientId, interactionType, messages, conversationId, createConversation, saveMessage])

  const handleCopy = useCallback(async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 2000)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const handleRetry = useCallback(() => {
    if (messages.length > 0) {
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
      if (lastUserMessage) {
        setInput(lastUserMessage.content)
        setMessages(prev => prev.slice(0, -2)) // Remove last user and assistant messages
        setError(null)
      }
    }
  }, [messages])

  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Header options */}
      <div className="p-4 border-b space-y-3">
        {/* History and New Chat buttons */}
        <div className="flex items-center justify-between">
          <ChatHistory
            onSelectConversation={loadConversation}
            currentConversationId={conversationId}
            clientId={clientId}
            clientFilter={!clientId}
          />
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={startNewConversation}
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        {/* Current conversation title */}
        {conversationTitle && (
          <div className="text-xs text-muted-foreground truncate">
            {conversationTitle}
          </div>
        )}

        {clientName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Context:</span>
            <span className="font-medium text-foreground">{clientName}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mode:</span>
          <Select value={interactionType} onValueChange={setInteractionType}>
            <SelectTrigger className="w-40 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERACTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="p-3 border-b">
          <AIConstraintWarnings
            warnings={parseWarnings(warnings)}
            collapsible={false}
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
            <Sparkles className="w-8 h-8 mb-3 opacity-50" />
            <p className="text-sm font-medium">Start a conversation</p>
            <p className="text-xs mt-1">
              {clientId
                ? `Ask about ${clientName || 'this client'}`
                : 'Ask any SEO strategy question'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-semibold prose-p:text-foreground prose-li:text-foreground prose-headings:text-foreground prose-strong:text-foreground text-foreground">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                  {message.role === 'assistant' && message.content && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 mt-2 text-xs opacity-60 hover:opacity-100"
                      onClick={() => handleCopy(message.content, index)}
                    >
                      {copiedIndex === index ? (
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
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-foreground animate-pulse">
                    {THINKING_MESSAGES[thinkingIndex]}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="ghost" size="sm" onClick={handleRetry} className="mt-1">
            Try again
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              clientId
                ? `Ask about ${clientName || 'this client'}...`
                : 'Ask a question...'
            }
            className="min-h-[44px] max-h-32 resize-none"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Shift+Enter for new line
        </p>
      </div>
    </div>
  )

  if (!floating) {
    return chatContent
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className={cn(
            'fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50',
            triggerClassName
          )}
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Stratosphere AI
          </SheetTitle>
        </SheetHeader>
        {chatContent}
      </SheetContent>
    </Sheet>
  )
}

/**
 * Compact AI chat trigger button for embedding in pages
 */
export function AIChatTrigger({
  clientId,
  clientName,
  className,
}: {
  clientId?: string
  clientName?: string
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Sparkles className="w-4 h-4 mr-1" />
          Ask AI
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Stratosphere AI
          </SheetTitle>
        </SheetHeader>
        <AIChatPanel
          clientId={clientId}
          clientName={clientName}
          floating={false}
        />
      </SheetContent>
    </Sheet>
  )
}
