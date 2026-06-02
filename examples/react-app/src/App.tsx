import React, { useState, useEffect } from 'react';
import { ITrackerCore } from '@dev-sujay/tracker-core';

declare global {
  interface Window {
    dsTracker?: ITrackerCore;
  }
}

export default function App() {
  const [sessionId, setSessionId] = useState<string>('');
  const [visitorId, setVisitorId] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [inputText, setInputText] = useState<string>('');

  useEffect(() => {
    // Read tracker details from localStorage
    const updateDetails = () => {
      setSessionId(localStorage.getItem('ds_tracker_session_id') || 'Not Initialized');
      setVisitorId(localStorage.getItem('ds_tracker_visitor_id') || 'Not Initialized');
    };
    
    updateDetails();
    const interval = setInterval(updateDetails, 2000);
    return () => clearInterval(interval);
  }, []);

  const addLog = (message: string) => {
    setLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] ${message}`,
      ...prev.slice(0, 19),
    ]);
  };

  const handleCustomEvent = () => {
    addLog('Triggered Custom Event');
    // Emitting direct custom event
    if (window.dsTracker) {
      window.dsTracker.track('CUSTOM', 'Custom Action Clicked', {
        timestamp: Date.now(),
        customField: 'demoValue',
      });
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px', minHeight: '180vh' }}>
      {/* Header card */}
      <header style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        padding: '30px',
        borderRadius: '16px',
        border: '1px solid #334155',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
        marginBottom: '40px'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5rem', fontWeight: 700, color: '#38bdf8' }}>
          Open-Source Modular Tracker Demo
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', margin: 0 }}>
          Scroll down, trigger clicks, type in inputs, and test rage clicking. All activities are captured and sent to the local server.
        </p>
      </header>

      {/* Grid details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ margin: '0 0 15px 0', color: '#f1f5f9', fontSize: '1.2rem' }}>Session Details</h2>
          <p style={{ margin: '5px 0', color: '#94a3b8' }}>
            <strong>Session ID:</strong>
            <span style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', wordBreak: 'break-all', fontFamily: 'monospace', marginTop: '4px' }}>
              {sessionId}
            </span>
          </p>
          <p style={{ margin: '15px 0 5px 0', color: '#94a3b8' }}>
            <strong>Visitor ID:</strong>
            <span style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', wordBreak: 'break-all', fontFamily: 'monospace', marginTop: '4px' }}>
              {visitorId}
            </span>
          </p>
        </div>

        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <h2 style={{ margin: '0 0 15px 0', color: '#f1f5f9', fontSize: '1.2rem' }}>Sandbox Controls</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <button 
              id="standard-btn"
              onClick={() => addLog('Clicked Standard Button')}
              style={{ padding: '10px 16px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              Standard Click Button
            </button>
            
            <button 
              id="rage-btn"
              onClick={() => addLog('Rage Click Source')}
              style={{ padding: '10px 16px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              Rage Click Me (Click 3x fast!)
            </button>
            
            <button 
              id="custom-event-btn"
              onClick={handleCustomEvent}
              style={{ padding: '10px 16px', background: '#10b981', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              Fire Custom Event
            </button>
          </div>
        </div>
      </div>

      {/* Input replay demo */}
      <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '40px' }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#f1f5f9', fontSize: '1.2rem' }}>Input Typing Replay Demo</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
          Type below. The session replay recorder will capture your keystrokes and play them back exactly as typed.
        </p>
        <input 
          id="replay-demo-input"
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type something here..." 
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#f8fafc', fontSize: '1rem', outline: 'none' }}
        />
      </div>

      {/* Local activity log console */}
      <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #1e293b', height: '200px', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#38bdf8', fontSize: '1rem' }}>Local UI Activity Logs</h3>
        {logs.length === 0 ? (
          <p style={{ color: '#475569', margin: 0, fontStyle: 'italic' }}>No local activities logged yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem', fontFamily: 'monospace', lineHeight: 1.6 }}>
            {logs.map((log, index) => (
              <li key={index} style={{ color: '#cbd5e1', borderBottom: '1px solid #1e293b', padding: '4px 0' }}>{log}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Scroll indicator block */}
      <div style={{ marginTop: '120px', padding: '30px', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center' }}>
        <h3 style={{ color: '#f1f5f9', margin: '0 0 10px 0' }}>Scroll Deeper</h3>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Keep scrolling down to trigger the 25%, 50%, 75%, and 100% scroll depth tracking milestones.
        </p>
      </div>
    </div>
  );
}
