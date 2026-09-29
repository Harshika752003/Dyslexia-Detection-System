import React, { useState, useRef } from 'react';
import AssessmentGame from './components/AssessmentGame';

export default function App() {
  const [formData, setFormData] = useState({
    Gender: '1',
    Age: '',
    Avg_Clicks: '',
    Avg_Hits: '',
    Avg_Misses: '',
    Avg_Score: '',
    Avg_Accuracy: '',
    Avg_Missrate: ''
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // null | { success: boolean, prediction: string, error?: string }
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [glowHighlight, setGlowHighlight] = useState(false);

  const resultRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApplyMetrics = (metrics) => {
    setFormData(prev => ({
      ...prev,
      Avg_Clicks: metrics.avgClicks.toString(),
      Avg_Hits: metrics.avgHits.toString(),
      Avg_Misses: metrics.avgMisses.toString(),
      Avg_Score: metrics.avgScore.toString(),
      Avg_Accuracy: metrics.avgAccuracy.toString(),
      Avg_Missrate: metrics.avgMissrate.toString()
    }));

    // Trigger visual feedback glow on form inputs
    setGlowHighlight(true);
    setTimeout(() => {
      setGlowHighlight(false);
    }, 3000);

    // Scroll to the metrics section smoothly
    const metricsSection = document.getElementById('metrics-header');
    if (metricsSection) {
      metricsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // Build form-urlencoded request body to match Flask request.form
      const formParams = new URLSearchParams();
      for (const key in formData) {
        formParams.append(key, formData[key]);
      }

      const response = await fetch('/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formParams.toString()
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      if (data.error) {
        setResult({ success: false, error: data.error });
      } else {
        setResult({ success: true, prediction: data.prediction });
      }

      // Smooth scroll to prediction results
      setTimeout(() => {
        if (resultRef.current) {
          resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

    } catch (err) {
      console.error('Prediction Error:', err);
      setResult({
        success: false,
        error: 'Failed to analyze metrics. Make sure the backend Flask server is running correctly.'
      });
    } finally {
      setLoading(false);
    }
  };

  const glowStyle = glowHighlight ? {
    borderColor: 'var(--success)',
    boxShadow: '0 0 10px rgba(52, 211, 153, 0.4)'
  } : {};

  return (
    <div className="container">
      <h1>Dyslexia Prediction System</h1>
      <p className="subtitle">An AI-powered diagnostic tool incorporating cognitive response games</p>

      {/* Interactive Game Callout Card */}
      <div className="game-info-card">
        <div className="game-info-content">
          <h3>Try the Diagnostic Assessment Game</h3>
          <p>
            Don't have the performance metrics below? Let the candidate play a quick 45-second bubble popping
            game. It measures spatial attention and visual letter-processing skills to auto-fill the form.
          </p>
        </div>
        <button 
          type="button" 
          className="btn-game-trigger" 
          onClick={() => setIsGameOpen(true)}
        >
          Start Game
        </button>
      </div>

      {/* Prediction Form */}
      <form onSubmit={handleSubmit}>
        <h3 style={{
          marginBottom: '20px',
          borderBottom: '1px solid var(--card-border)',
          paddingBottom: '10px',
          color: 'var(--accent-primary)'
        }}>
          1. Demographics
        </h3>
        
        <div className="form-row">
          <div className="input-group">
            <label htmlFor="Gender">Gender</label>
            <select 
              id="Gender" 
              name="Gender" 
              value={formData.Gender} 
              onChange={handleInputChange} 
              required
            >
              <option value="1">Boy</option>
              <option value="2">Girl</option>
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="Age">Age (3 - 7)</label>
            <input 
              type="number" 
              id="Age" 
              name="Age" 
              placeholder="Enter age" 
              min="3" 
              max="7" 
              value={formData.Age} 
              onChange={handleInputChange} 
              required 
            />
          </div>
        </div>

        <h3 
          id="metrics-header" 
          style={{
            margin: '30px 0 20px 0',
            borderBottom: '1px solid var(--card-border)',
            paddingBottom: '10px',
            color: 'var(--accent-primary)'
          }}
        >
          2. Game Performance Metrics
        </h3>

        <div className="form-row">
          <div className="input-group">
            <label htmlFor="Avg_Clicks">Average Clicks</label>
            <input 
              type="number" 
              step="0.01" 
              id="Avg_Clicks" 
              name="Avg_Clicks" 
              placeholder="e.g. 8.5" 
              value={formData.Avg_Clicks} 
              onChange={handleInputChange} 
              style={glowStyle}
              required 
            />
          </div>
          <div className="input-group">
            <label htmlFor="Avg_Hits">Average Hits</label>
            <input 
              type="number" 
              step="0.01" 
              id="Avg_Hits" 
              name="Avg_Hits" 
              placeholder="e.g. 5.2" 
              value={formData.Avg_Hits} 
              onChange={handleInputChange} 
              style={glowStyle}
              required 
            />
          </div>
          <div className="input-group">
            <label htmlFor="Avg_Misses">Average Misses</label>
            <input 
              type="number" 
              step="0.01" 
              id="Avg_Misses" 
              name="Avg_Misses" 
              placeholder="e.g. 3.3" 
              value={formData.Avg_Misses} 
              onChange={handleInputChange} 
              style={glowStyle}
              required 
            />
          </div>
        </div>

        <div className="form-row">
          <div className="input-group">
            <label htmlFor="Avg_Score">Average Score</label>
            <input 
              type="number" 
              step="0.01" 
              id="Avg_Score" 
              name="Avg_Score" 
              placeholder="e.g. 35.0" 
              value={formData.Avg_Score} 
              onChange={handleInputChange} 
              style={glowStyle}
              required 
            />
          </div>
          <div className="input-group">
            <label htmlFor="Avg_Accuracy">Average Accuracy</label>
            <input 
              type="number" 
              step="0.0001" 
              id="Avg_Accuracy" 
              name="Avg_Accuracy" 
              placeholder="e.g. 0.61" 
              value={formData.Avg_Accuracy} 
              onChange={handleInputChange} 
              style={glowStyle}
              required 
            />
          </div>
          <div className="input-group">
            <label htmlFor="Avg_Missrate">Average Missrate</label>
            <input 
              type="number" 
              step="0.0001" 
              id="Avg_Missrate" 
              name="Avg_Missrate" 
              placeholder="e.g. 0.39" 
              value={formData.Avg_Missrate} 
              onChange={handleInputChange} 
              style={glowStyle}
              required 
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="btn-predict"
          disabled={loading}
        >
          {loading ? 'Analyzing Metrics...' : 'Analyze Dyslexia Risk'}
        </button>
      </form>

      {/* Prediction Result Container */}
      {result && (
        <div 
          ref={resultRef}
          className={`result ${result.success ? (result.prediction === 'Dyslexic' ? 'dyslexic' : 'not-dyslexic') : ''}`}
          style={!result.success ? {
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            display: 'block'
          } : { display: 'block' }}
        >
          {result.success ? (
            result.prediction === 'Dyslexic' ? (
              <>
                <div className="result-title">High Risk Detected</div>
                <p>
                  The assessment metrics suggest a high probability of reading challenges consistent with Dyslexia. 
                  We recommend consulting an educational specialist for a comprehensive clinical analysis.
                </p>
              </>
            ) : (
              <>
                <div className="result-title">Low Risk Detected</div>
                <p>
                  The assessment metrics indicate cognitive processing speeds and target attention levels within standard profiles. 
                  No typical indicators of dyslexia were found.
                </p>
              </>
            )
          ) : (
            <>
              <div className="result-title">Submission Error</div>
              <p>{result.error}</p>
            </>
          )}
        </div>
      )}

      {/* Assessment Game Modal Overlay */}
      <AssessmentGame 
        isOpen={isGameOpen}
        onClose={() => setIsGameOpen(false)}
        onApplyMetrics={handleApplyMetrics}
      />
    </div>
  );
}
