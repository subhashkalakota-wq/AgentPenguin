import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  BrainCircuit, 
  MousePointer, 
  ShieldCheck, 
  Search, 
  Copy, 
  Check, 
  Trash2, 
  ArrowDown, 
  Radio
} from 'lucide-react';

export default function LiveExecutionTrace({ logs, onClearLogs }) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const terminalContainerRef = useRef(null);

  useEffect(() => {
    if (autoScroll && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'llm' && log.type !== 'llm') return false;
    if (filter === 'playwright' && log.type !== 'playwright') return false;
    if (filter === 'cdp' && log.type !== 'cdp') return false;
    if (filter === 'warn' && log.type !== 'warn') return false;
    if (filter === 'success' && log.type !== 'success') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.tag.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCopy = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.tag}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBadgeClass = (type) => {
    switch (type) {
      case 'llm': return 'log-tag-llm';
      case 'playwright': return 'log-tag-playwright';
      case 'cdp': return 'log-tag-cdp';
      case 'success': return 'log-tag-success';
      case 'warn': return 'log-tag-warn';
      default: return 'log-tag-default';
    }
  };

  return (
    <div className="terminal-card">
      {/* Terminal Header */}
      <div className="terminal-header">
        <div className="terminal-title-group">
          <Terminal size={17} className="text-accent" />
          <span className="terminal-title">Agent Reasoning Trace & CDP Stream</span>
          <span className="terminal-live-pill">
            <Radio size={12} className="animate-pulse" />
            LIVE
          </span>
        </div>

        {/* Action Controls */}
        <div className="terminal-actions">
          <div className="search-input-box">
            <Search size={13} />
            <input 
              type="text" 
              placeholder="Search trace..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="terminal-search-input"
            />
          </div>

          <button 
            className={`action-btn-sm ${autoScroll ? 'active' : ''}`}
            onClick={() => setAutoScroll(!autoScroll)}
            title="Toggle auto-scroll to bottom"
          >
            <ArrowDown size={13} />
            <span>Scroll</span>
          </button>

          <button 
            className="action-btn-sm" 
            onClick={handleCopy}
            title="Copy trace log"
          >
            {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button 
            className="action-btn-sm text-dim hover-danger" 
            onClick={onClearLogs}
            title="Clear terminal stream"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="terminal-filter-bar">
        <button 
          className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Stream ({logs.length})
        </button>
        <button 
          className={`filter-chip ${filter === 'llm' ? 'active' : ''}`}
          onClick={() => setFilter('llm')}
        >
          <BrainCircuit size={12} />
          LLM Decisions
        </button>
        <button 
          className={`filter-chip ${filter === 'playwright' ? 'active' : ''}`}
          onClick={() => setFilter('playwright')}
        >
          <MousePointer size={12} />
          Playwright Actions
        </button>
        <button 
          className={`filter-chip ${filter === 'cdp' ? 'active' : ''}`}
          onClick={() => setFilter('cdp')}
        >
          CDP Port
        </button>
        <button 
          className={`filter-chip ${filter === 'warn' ? 'active' : ''}`}
          onClick={() => setFilter('warn')}
        >
          <ShieldCheck size={12} />
          Safeguards / Review
        </button>
      </div>

      {/* Terminal Scroll Stream */}
      <div className="terminal-logs-window" ref={terminalContainerRef}>
        {filteredLogs.length === 0 ? (
          <div className="terminal-empty">No trace entries match current filter.</div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="terminal-log-line">
              <span className="log-timestamp">{log.timestamp}</span>
              <span className={`log-tag ${getBadgeClass(log.type)}`}>
                {log.tag}
              </span>
              <span className="log-text">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
