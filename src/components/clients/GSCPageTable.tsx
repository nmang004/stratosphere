'use client';

/**
 * GSCPageTable
 *
 * Sortable, paginated table for top pages.
 * Features:
 * - Sortable columns
 * - URL truncation with tooltip
 * - Search/filter
 * - Pagination
 * - CSV export
 */

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { GSCPageData } from '@/lib/gsc/types';
import { cn } from '@/lib/utils';

interface GSCPageTableProps {
  data: GSCPageData[] | undefined;
  isLoading?: boolean;
  title?: string;
  pageSize?: number;
}

type SortKey = 'page' | 'clicks' | 'impressions' | 'ctr' | 'position';
type SortDirection = 'asc' | 'desc';

/**
 * Truncate URL for display while preserving useful parts
 */
function truncateUrl(url: string, maxLength = 50): string {
  if (url.length <= maxLength) return url;

  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Remove domain, show path
    if (path.length <= maxLength) {
      return path;
    }

    // Truncate from middle
    const start = path.slice(0, 20);
    const end = path.slice(-25);
    return `${start}...${end}`;
  } catch {
    // Not a valid URL, truncate normally
    return url.slice(0, maxLength - 3) + '...';
  }
}

/**
 * Get page path without domain
 */
function getPagePath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search;
  } catch {
    return url;
  }
}

export function GSCPageTable({
  data,
  isLoading,
  title = 'Top Pages',
  pageSize = 10,
}: GSCPageTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('clicks');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  // Filter and sort data
  const processedData = useMemo(() => {
    if (!data) return [];

    let filtered = data;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = data.filter((item) =>
        item.page.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [data, searchQuery, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = processedData.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  // Handle sort
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
    setCurrentPage(0);
  };

  // Export to CSV
  const handleExport = () => {
    if (!data) return;

    const headers = ['Page URL', 'Clicks', 'Impressions', 'CTR', 'Position'];
    const rows = processedData.map((item) => [
      `"${item.page.replace(/"/g, '""')}"`,
      item.clicks,
      item.impressions,
      (item.ctr * 100).toFixed(2) + '%',
      item.position.toFixed(1),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pages-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render sort icon
  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) {
      return <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4" />
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No page data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search pages..."
              className="pl-8 w-[200px]"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('page')}
                    className="h-8 px-2 -ml-2"
                  >
                    Page
                    <SortIcon column="page" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('clicks')}
                    className="h-8 px-2"
                  >
                    Clicks
                    <SortIcon column="clicks" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('impressions')}
                    className="h-8 px-2"
                  >
                    Impressions
                    <SortIcon column="impressions" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('ctr')}
                    className="h-8 px-2"
                  >
                    CTR
                    <SortIcon column="ctr" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('position')}
                    className="h-8 px-2"
                  >
                    Position
                    <SortIcon column="position" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item, index) => (
                <TableRow key={item.page + index}>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={item.page}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <span className="truncate max-w-[280px]">
                              {getPagePath(item.page)}
                            </span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[400px]">
                          <p className="break-all">{item.page}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-right">{item.clicks.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.impressions.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{(item.ctr * 100).toFixed(2)}%</TableCell>
                  <TableCell className="text-right">{item.position.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {currentPage * pageSize + 1} to{' '}
              {Math.min((currentPage + 1) * pageSize, processedData.length)} of{' '}
              {processedData.length} pages
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
