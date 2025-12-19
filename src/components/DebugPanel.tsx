import { Bug, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { DebugInfo } from '@/hooks/useMailApi';

interface DebugPanelProps {
  debugInfo: DebugInfo;
  isOpen: boolean;
  onToggle: () => void;
}

export function DebugPanel({ debugInfo, isOpen, onToggle }: DebugPanelProps) {
  const [expanded, setExpanded] = useState({
    request: true,
    response: true,
    error: true,
  });

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="fixed bottom-4 right-4 rounded-xl bg-secondary hover:bg-secondary/80 text-xs gap-1.5 z-50"
      >
        <Bug className="w-3.5 h-3.5" />
        Debug
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-[420px] max-h-[60vh] bg-card border border-border rounded-2xl shadow-lg overflow-hidden z-50 animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary/50 border-b border-border">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Debug Panel</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-7 w-7 rounded-lg">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="overflow-auto max-h-[calc(60vh-52px)] p-3 space-y-3">
        {/* Last Request */}
        <div className="rounded-xl bg-secondary/30 overflow-hidden">
          <button
            onClick={() => setExpanded(prev => ({ ...prev, request: !prev.request }))}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary/50"
          >
            <span>Last Request</span>
            {expanded.request ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {expanded.request && (
            <div className="px-3 pb-3 space-y-1">
              {debugInfo.lastRequest ? (
                <>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Method: </span>
                    <code className="text-foreground bg-secondary px-1 rounded">{debugInfo.lastRequest.method}</code>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">URL: </span>
                    <code className="text-foreground text-[10px] break-all">{debugInfo.lastRequest.url}</code>
                  </div>
                  {debugInfo.lastRequest.body && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Body: </span>
                      <pre className="text-[10px] text-foreground bg-secondary p-2 rounded-lg mt-1 overflow-auto max-h-20">
                        {debugInfo.lastRequest.body}
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted-foreground">No request yet</span>
              )}
            </div>
          )}
        </div>

        {/* Last Response */}
        <div className="rounded-xl bg-secondary/30 overflow-hidden">
          <button
            onClick={() => setExpanded(prev => ({ ...prev, response: !prev.response }))}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary/50"
          >
            <span>Last Response</span>
            {expanded.response ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {expanded.response && (
            <div className="px-3 pb-3 space-y-1">
              {debugInfo.lastResponse ? (
                <>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Status: </span>
                    <code className={`px-1 rounded ${debugInfo.lastResponse.status >= 200 && debugInfo.lastResponse.status < 300 ? 'bg-accent text-accent-foreground' : 'bg-destructive/30 text-destructive-foreground'}`}>
                      {debugInfo.lastResponse.status} {debugInfo.lastResponse.statusText}
                    </code>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Response: </span>
                    <pre className="text-[10px] text-foreground bg-secondary p-2 rounded-lg mt-1 overflow-auto max-h-32 whitespace-pre-wrap break-all">
                      {debugInfo.lastResponse.text}
                    </pre>
                  </div>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">No response yet</span>
              )}
            </div>
          )}
        </div>

        {/* Last Error */}
        {debugInfo.lastError && (
          <div className="rounded-xl bg-destructive/10 overflow-hidden">
            <button
              onClick={() => setExpanded(prev => ({ ...prev, error: !prev.error }))}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/20"
            >
              <span>Last Error</span>
              {expanded.error ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expanded.error && (
              <div className="px-3 pb-3">
                <pre className="text-[10px] text-destructive-foreground whitespace-pre-wrap break-all">
                  {debugInfo.lastError}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
