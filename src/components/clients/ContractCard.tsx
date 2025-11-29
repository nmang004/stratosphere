'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  FileText,
  Calendar,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'
import type { ClientContract } from '@/types/database'

interface ContractCardProps {
  contract: ClientContract | null
  className?: string
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate)
  const now = new Date()
  const diffTime = end.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function getProgressPercentage(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const now = new Date().getTime()

  if (now >= end) return 100
  if (now <= start) return 0

  return Math.round(((now - start) / (end - start)) * 100)
}

export function ContractCard({ contract, className }: ContractCardProps) {
  if (!contract) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Contract
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No contract information available.
          </p>
        </CardContent>
      </Card>
    )
  }

  const daysRemaining = getDaysRemaining(contract.contract_end)
  const progress = getProgressPercentage(contract.contract_start, contract.contract_end)
  const isExpiringSoon = daysRemaining <= 30 && daysRemaining > 0
  const isExpired = daysRemaining <= 0

  return (
    <Card
      className={cn(
        className,
        isExpiringSoon && !contract.auto_renew && 'border-yellow-500/50',
        isExpired && 'border-red-500/50'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Contract
          </CardTitle>
          <div className="flex items-center gap-2">
            {contract.auto_renew ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                <RefreshCw className="h-3 w-3" />
                Auto-Renew
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Manual Renewal
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Monthly value */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Monthly Value
          </div>
          <span className="font-semibold text-lg">
            {formatCurrency(contract.monthly_value)}
          </span>
        </div>

        {/* Contract period */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Contract Period
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>{formatDate(contract.contract_start)}</span>
            <span className="text-muted-foreground">to</span>
            <span>{formatDate(contract.contract_end)}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Contract Progress</span>
            <span
              className={cn(
                'font-medium',
                isExpired && 'text-red-500',
                isExpiringSoon && !contract.auto_renew && 'text-yellow-500'
              )}
            >
              {isExpired
                ? 'Expired'
                : `${daysRemaining} days remaining`}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all',
                isExpired && 'bg-red-500',
                isExpiringSoon && !contract.auto_renew && 'bg-yellow-500',
                !isExpired && !isExpiringSoon && 'bg-primary'
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Warning for expiring contracts */}
        {isExpiringSoon && !contract.auto_renew && (
          <div className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded-md">
            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-yellow-600">Contract Expiring Soon</p>
              <p className="text-muted-foreground mt-0.5">
                {contract.renewal_notice_days
                  ? `${contract.renewal_notice_days} day notice period required.`
                  : 'Schedule renewal discussion.'}
              </p>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="flex items-start gap-2 p-2 bg-red-500/10 rounded-md">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-red-600">Contract Expired</p>
              <p className="text-muted-foreground mt-0.5">
                Immediate action required. Contact client about renewal.
              </p>
            </div>
          </div>
        )}

        {/* Renewal notice */}
        {contract.renewal_notice_days && !isExpired && (
          <div className="text-xs text-muted-foreground">
            Renewal notice period: {contract.renewal_notice_days} days
          </div>
        )}

        {/* View contract button */}
        <Button variant="outline" size="sm" className="w-full gap-2" disabled>
          <ExternalLink className="h-3 w-3" />
          View Full Contract
        </Button>
      </CardContent>
    </Card>
  )
}
