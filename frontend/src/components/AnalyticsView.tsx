import React, { useEffect, useState } from 'react';
import { BarChart2, Mic, FileText, CheckCircle2, Globe, Cpu, RefreshCw } from 'lucide-react';
import type { Stats } from '../types';
import { fetchStats } from '../api';

export const AnalyticsView: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await fetchStats();
      setStats(data);
    } catch (e) {
      console.error('Error loading stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="analytics-layout">
      <div className="analytics-header-card glass-panel">
        <div className="analytics-header-row">
          <div>
            <div className="dash-title-row">
              <BarChart2 size={20} className="text-accent-secondary" />
              <h2>Transcription Analytics & Database Insights</h2>
            </div>
            <p className="dash-subtitle">Aggregated metrics, language distribution, and engine performance.</p>
          </div>
          <button 
            type="button" 
            className="btn-secondary icon-only"
            onClick={loadStats}
            title="Refresh statistics"
          >
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="metrics-summary-grid">
        <div className="metric-stat-card glass-panel">
          <div className="stat-card-icon-wrapper bg-indigo">
            <Mic size={22} className="text-accent-primary" />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Total Transcriptions</span>
            <span className="stat-card-value">{stats?.totalCount || 0}</span>
          </div>
        </div>

        <div className="metric-stat-card glass-panel">
          <div className="stat-card-icon-wrapper bg-cyan">
            <FileText size={22} className="text-accent-cyan" />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Words Transcribed</span>
            <span className="stat-card-value">{stats?.totalWords?.toLocaleString() || 0}</span>
          </div>
        </div>

        <div className="metric-stat-card glass-panel">
          <div className="stat-card-icon-wrapper bg-emerald">
            <CheckCircle2 size={22} className="text-accent-emerald" />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Avg Confidence</span>
            <span className="stat-card-value">{Math.round((stats?.avgConfidence || 0.96) * 100)}%</span>
          </div>
        </div>

        <div className="metric-stat-card glass-panel">
          <div className="stat-card-icon-wrapper bg-purple">
            <Globe size={22} className="text-accent-secondary" />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Audio Transcribed</span>
            <span className="stat-card-value">
              {stats ? `${Math.round(stats.totalDurationSeconds / 60 * 10) / 10}m` : '0m'}
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown Grids */}
      <div className="analytics-charts-grid">
        {/* Language Breakdown */}
        <section className="chart-card glass-panel">
          <div className="chart-card-header">
            <Globe size={18} className="text-accent-cyan" />
            <h3>Language Breakdown (Hinglish / Hindi / English)</h3>
          </div>
          <div className="breakdown-list">
            {stats?.languageBreakdown && stats.languageBreakdown.length > 0 ? (
              stats.languageBreakdown.map((item, idx) => {
                const percentage = stats.totalCount > 0 
                  ? Math.round((item.count / stats.totalCount) * 100) 
                  : 0;
                return (
                  <div key={idx} className="breakdown-item">
                    <div className="breakdown-meta">
                      <span className="breakdown-name">{item.language_detected}</span>
                      <span className="breakdown-count">{item.count} sessions ({percentage}%)</span>
                    </div>
                    <div className="breakdown-bar-track">
                      <div 
                        className="breakdown-bar-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-muted">No language data recorded yet.</p>
            )}
          </div>
        </section>

        {/* Engine Breakdown */}
        <section className="chart-card glass-panel">
          <div className="chart-card-header">
            <Cpu size={18} className="text-accent-secondary" />
            <h3>Engines Used</h3>
          </div>
          <div className="breakdown-list">
            {stats?.engineBreakdown && stats.engineBreakdown.length > 0 ? (
              stats.engineBreakdown.map((item, idx) => {
                const percentage = stats.totalCount > 0 
                  ? Math.round((item.count / stats.totalCount) * 100) 
                  : 0;
                return (
                  <div key={idx} className="breakdown-item">
                    <div className="breakdown-meta">
                      <span className="breakdown-name">{item.engine_used}</span>
                      <span className="breakdown-count">{item.count} sessions ({percentage}%)</span>
                    </div>
                    <div className="breakdown-bar-track">
                      <div 
                        className="breakdown-bar-fill purple"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-muted">No engine data recorded yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
