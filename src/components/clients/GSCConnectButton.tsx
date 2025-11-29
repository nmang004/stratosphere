'use client';

/**
 * GSCConnectButton
 *
 * Button for connecting/disconnecting client GSC account.
 * Features:
 * - OAuth flow initiation
 * - Connection status display
 * - Disconnect option
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Link, Unlink, AlertTriangle, TestTube2 } from 'lucide-react';
import { useGSCConnection } from '@/lib/hooks/useGSC';
import { cn } from '@/lib/utils';

interface GSCConnectButtonProps {
  clientId: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  showStatus?: boolean;
}

export function GSCConnectButton({
  clientId,
  variant = 'outline',
  size = 'default',
  showStatus = true,
}: GSCConnectButtonProps) {
  const {
    isConnected,
    canConnect,
    hasCredentials,
    isMockMode,
    isLoading,
    initiateOAuth,
  } = useGSCConnection(clientId);

  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch(`/api/gsc/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-9 w-[140px]" />;
  }

  // Mock mode indicator
  if (isMockMode) {
    return (
      <div className="flex items-center gap-2">
        {showStatus && (
          <Badge variant="secondary" className="gap-1">
            <TestTube2 className="h-3 w-3" />
            Demo Mode
          </Badge>
        )}
        <Button variant={variant} size={size} disabled>
          <Link className="h-4 w-4 mr-2" />
          Using Demo Data
        </Button>
      </div>
    );
  }

  // No credentials configured
  if (!hasCredentials) {
    return (
      <div className="flex items-center gap-2">
        {showStatus && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Not Configured
          </Badge>
        )}
        <Button variant={variant} size={size} disabled>
          <XCircle className="h-4 w-4 mr-2" />
          GSC Not Available
        </Button>
      </div>
    );
  }

  // Connected state
  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        {showStatus && (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Connected
          </Badge>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size={size}>
              <Unlink className="h-4 w-4 mr-2" />
              Disconnect GSC
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect Google Search Console?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the GSC connection for this client. You can reconnect at any time.
                Cached data will be preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Can connect state
  if (canConnect) {
    return (
      <div className="flex items-center gap-2">
        {showStatus && (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Not Connected
          </Badge>
        )}
        <Button variant={variant} size={size} onClick={initiateOAuth}>
          <Link className="h-4 w-4 mr-2" />
          Connect Google Search Console
        </Button>
      </div>
    );
  }

  // Fallback
  return null;
}

/**
 * GSC connection status badge (compact version)
 */
export function GSCStatusBadge({ clientId }: { clientId: string }) {
  const { isConnected, isMockMode, isLoading } = useGSCConnection(clientId);

  if (isLoading) {
    return <Skeleton className="h-5 w-20" />;
  }

  if (isMockMode) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <TestTube2 className="h-3 w-3" />
        Demo
      </Badge>
    );
  }

  if (isConnected) {
    return (
      <Badge variant="default" className="gap-1 text-xs bg-green-600">
        <CheckCircle className="h-3 w-3" />
        GSC Connected
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-xs">
      <XCircle className="h-3 w-3" />
      GSC Not Connected
    </Badge>
  );
}
