'use client'

/**
 * ChatHistory Component
 *
 * Shows list of past AI conversations with search, filtering,
 * and ability to resume or delete conversations.
 */

import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  History,
  Search,
  MessageSquare,
  Trash2,
  MoreVertical,
  Archive,
  Building2,
  X,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ConversationListItem } from '@/types/database'

interface ChatHistoryProps {
  onSelectConversation: (conversationId: string) => void
  currentConversationId?: string | null
  clientId?: string
  clientFilter?: boolean
}

interface ConversationWithClient extends ConversationListItem {
  client?: { id: string; name: string } | null
}

export function ChatHistory({
  onSelectConversation,
  currentConversationId,
  clientId,
  clientFilter = true,
}: ChatHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [conversations, setConversations] = useState<ConversationWithClient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterClientId, setFilterClientId] = useState<string | 'all'>(clientId || 'all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const fetchConversations = useCallback(async (reset = false) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (filterClientId && filterClientId !== 'all') params.set('clientId', filterClientId)
      params.set('limit', '20')
      params.set('offset', reset ? '0' : offset.toString())

      const response = await fetch(`/api/ai/conversations?${params}`)
      if (!response.ok) throw new Error('Failed to fetch')

      const data = await response.json()

      if (reset) {
        setConversations(data.conversations)
        setOffset(20)
      } else {
        setConversations((prev) => [...prev, ...data.conversations])
        setOffset((prev) => prev + 20)
      }
      setHasMore(data.hasMore)
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, filterClientId, offset])

  // Fetch on open and when filters change
  useEffect(() => {
    if (isOpen) {
      fetchConversations(true)
    }
  }, [isOpen, searchQuery, filterClientId])

  const handleDelete = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/ai/conversations/${conversationId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete')

      setConversations((prev) => prev.filter((c) => c.id !== conversationId))
      setDeleteDialogOpen(false)
      setConversationToDelete(null)
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  const handleArchive = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/ai/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: true }),
      })
      if (!response.ok) throw new Error('Failed to archive')

      setConversations((prev) => prev.filter((c) => c.id !== conversationId))
    } catch (error) {
      console.error('Failed to archive conversation:', error)
    }
  }

  const handleSelect = (conversationId: string) => {
    onSelectConversation(conversationId)
    setIsOpen(false)
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1">
            <History className="w-4 h-4" />
            History
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full sm:w-[400px] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Chat History
            </SheetTitle>
          </SheetHeader>

          {/* Search and Filter */}
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {clientFilter && (
              <Select value={filterClientId} onValueChange={setFilterClientId}>
                <SelectTrigger className="w-full">
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {/* Client options would be dynamically loaded */}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && conversations.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground px-4">
                <MessageSquare className="w-8 h-8 mb-3 opacity-50" />
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="text-xs mt-1">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Start a chat to see your history here'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      'p-4 hover:bg-muted/50 cursor-pointer transition-colors group',
                      currentConversationId === conversation.id && 'bg-muted'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => handleSelect(conversation.id)}
                      >
                        <p className="font-medium text-sm truncate">
                          {conversation.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {conversation.client_name && (
                            <Badge variant="outline" className="text-xs">
                              {conversation.client_name}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conversation.updated_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {conversation.message_count} message
                          {conversation.message_count !== 1 ? 's' : ''}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleSelect(conversation.id)}>
                            <ChevronRight className="w-4 h-4 mr-2" />
                            Continue
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(conversation.id)}>
                            <Archive className="w-4 h-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setConversationToDelete(conversation.id)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}

                {hasMore && (
                  <div className="p-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchConversations(false)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be
              undone and all messages will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => conversationToDelete && handleDelete(conversationToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
