/**
 * Client-side Sync component (shared)
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SyncMetadata } from '@/models/asanaReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Database, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Activity,
  ArrowLeft
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface SyncClientProps {
  lastSync: SyncMetadata | null;
  userEmail: string;
}

interface SyncProgress {
  step: string;
  progress: number;
  message: string;
  isComplete: boolean;
  hasError: boolean;
}

export function SyncClient({ lastSync, userEmail }: SyncClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [, setSyncProgress] = useState<SyncProgress[]>([]);
  const [currentSync, setCurrentSync] = useState<SyncMetadata | null>(lastSync);
  const [error, setError] = useState<string | null>(null);
  // track whether we've triggered due to a force request
  const forceTriggeredRef = useRef<boolean>(false);

  const router = useRouter();
  
  const handleSync = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSyncProgress([]);

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      const result = await response.json();
      setCurrentSync(result.metadata);

      if (result.success) setIsLoading(false);
      else {
        setError(result.message || 'Sync failed');
        setIsLoading(false);
      }

    } catch (err) {
      console.error('Error starting sync:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsLoading(false);
    }
  }, [userEmail]);

  // When an auto-triggered sync completes successfully, navigate to the dashboard
  useEffect(() => {
    try {
      // if we previously triggered via the force trigger and the current sync
      // completed successfully, redirect.
      if (forceTriggeredRef.current && currentSync?.status === 'success') {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Failed to redirect after forced sync:', err);
    }
  }, [currentSync, router]);

  useEffect(() => {
    // Trigger sync when `forceSync` prop becomes true. This is a one-time trigger per mount
    // to mirror the previous behavior but explicit via prop.
    try {
      // eslint-disable-next-line react-hooks/exhaustive-deps
    } catch (err) {
      console.error('Unexpected error in forceSync effect setup:', err);
    }

    let pollInterval: NodeJS.Timeout | undefined;

    if (isLoading) {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch('/api/sync/status');
          if (response.ok) {
            const data = await response.json();
            setCurrentSync(data.lastSync);
            if (data.lastSync?.status !== 'in-progress') {
              setIsLoading(false);
              if (data.lastSync?.status === 'error') {
                setError(data.lastSync.message || 'Sync failed');
              }
            }
          }
        } catch (err) {
          console.error('Error polling sync status:', err);
        }
      }, 2000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isLoading, handleSync]);


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'in-progress':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatLastSync = (timestamp: string) => {
    const date = dayjs(timestamp);
    return { relative: date.fromNow(), absolute: date.format('MMMM DD, YYYY at HH:mm:ss') };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                <Database className="w-8 h-8 inline mr-3" />
                Data Synchronization
              </h1>
              <p className="text-gray-600 mt-2">Sync data from Asana to the dashboard database</p>
            </div>
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Current Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentSync ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(currentSync.status)}
                    <div>
                      <div className="font-medium">Last Sync: {formatLastSync(currentSync.lastUpdated).relative}</div>
                      <div className="text-sm text-gray-500">{formatLastSync(currentSync.lastUpdated).absolute}</div>
                    </div>
                  </div>
                  {getStatusBadge(currentSync.status)}
                </div>

                {currentSync.message && <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{currentSync.message}</div>}
                {currentSync.recordCount && <div className="text-sm text-gray-600">Records processed: {currentSync.recordCount.toLocaleString()}</div>}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">No sync history available</div>
            )}
          </CardContent>
        </Card>

        {error && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Sync Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sync Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Full Sync</h3>
                  <p className="text-sm text-gray-600">Fetch all data from Asana and update the database</p>
                </div>
                <Button onClick={handleSync} disabled={isLoading} className="min-w-[120px]">
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Start Sync
                    </>
                  )}
                </Button>
              </div>

              {isLoading && (
                <div className="bg-blue-50 p-4 rounded-md">
                  <div className="flex items-center space-x-2 text-blue-600 mb-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="font-medium">Sync in progress...</span>
                  </div>
                  <p className="text-sm text-blue-600">This may take several minutes depending on the amount of data.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">What gets synced:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Project sections</li>
                  <li>• Tasks and their details</li>
                  <li>• Subtasks and assignments</li>
                  <li>• Assignee information</li>
                  <li>• Completion dates and status</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Sync frequency:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Manual sync via this page</li>
                  <li>• Recommended: Daily sync</li>
                  <li>• Data is incrementally updated</li>
                  <li>• Full refresh every time</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-md">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Important Notes:</p>
                  <ul className="text-yellow-700 mt-1 space-y-1">
                    <li>• Ensure stable internet connection during sync</li>
                    <li>• Large projects may take several minutes to sync</li>
                    <li>• Do not close this page during active sync</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
