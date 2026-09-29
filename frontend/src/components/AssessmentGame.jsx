import React, { useState, useEffect, useRef } from 'react';

const CONFUSABLES = ['b', 'd', 'p', 'q', 'g'];
const MAX_ROUNDS = 5;
const ROUND_DURATION = 8; // seconds

export default function AssessmentGame({ isOpen, onClose, onApplyMetrics }) {
  const [screen, setScreen] = useState('instructions'); // 'instructions' | 'play' | 'complete'
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [targetLetter, setTargetLetter] = useState('b');
  const [showLevelOverlay, setShowLevelOverlay] = useState(false);

  // Summary state values
  const [summaryMetrics, setSummaryMetrics] = useState({
    avgClicks: 0,
    avgHits: 0,
    avgMisses: 0,
    avgScore: 0,
    avgAccuracy: 0,
    avgMissrate: 0
  });

  // Game tracking refs (bypass React state latency for real-time loops)
  const gameActiveRef = useRef(false);
  const bubblesRef = useRef([]); // holds bubble physical properties
  const roundMetricsRef = useRef([]); // logs each round's raw counts
  const currentRoundRef = useRef(1);
  const scoreRef = useRef(0);
  const currentTargetLetterRef = useRef('b');
  
  // Stats inside current round
  const currentClicksRef = useRef(0);
  const currentHitsRef = useRef(0);
  const currentMissesRef = useRef(0);
  const currentRoundScoreRef = useRef(0);

  // DOM Refs
  const playAreaRef = useRef(null);
  const gameCardRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Close and stop game when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopGameSession();
    } else {
      setScreen('instructions');
    }
    return () => stopGameSession();
  }, [isOpen]);

  const stopGameSession = () => {
    gameActiveRef.current = false;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    bubblesRef.current = [];
  };

  const startAssessment = () => {
    currentRoundRef.current = 1;
    scoreRef.current = 0;
    roundMetricsRef.current = [];
    setRound(1);
    setScore(0);
    setScreen('play');
    startRound();
  };

  const startRound = () => {
    // Reset round-level counters
    currentClicksRef.current = 0;
    currentHitsRef.current = 0;
    currentMissesRef.current = 0;
    currentRoundScoreRef.current = 0;
    
    setTimeLeft(ROUND_DURATION);
    setRound(currentRoundRef.current);
    setScore(scoreRef.current);

    // Pick a random target letter
    const randLetter = CONFUSABLES[Math.floor(Math.random() * CONFUSABLES.length)];
    currentTargetLetterRef.current = randLetter;
    setTargetLetter(randLetter);

    // Prepare bubbles configuration
    bubblesRef.current = [];
    
    // Set level overlay to notify round starting
    setShowLevelOverlay(true);

    setTimeout(() => {
      setShowLevelOverlay(false);
      setupPlayArea();
      gameActiveRef.current = true;
      startGameLoop();
      startTimer();
    }, 1200);
  };

  const startTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    let timeRemaining = ROUND_DURATION;
    timerIntervalRef.current = setInterval(() => {
      timeRemaining--;
      setTimeLeft(timeRemaining);

      if (timeRemaining <= 0) {
        clearInterval(timerIntervalRef.current);
        endRound();
      }
    }, 1000);
  };

  const setupPlayArea = () => {
    if (!playAreaRef.current) return;
    
    const width = playAreaRef.current.clientWidth;
    const height = playAreaRef.current.clientHeight;
    const bubbleRadius = 32.5; // half of 65px diameter

    const targetsToSpawn = 3;
    const distractorsToSpawn = 4;

    const lettersList = [];
    for (let i = 0; i < targetsToSpawn; i++) {
      lettersList.push({ text: currentTargetLetterRef.current, isTarget: true });
    }
    for (let i = 0; i < distractorsToSpawn; i++) {
      const distractors = CONFUSABLES.filter(c => c !== currentTargetLetterRef.current);
      const randDistractor = distractors[Math.floor(Math.random() * distractors.length)];
      lettersList.push({ text: randDistractor, isTarget: false });
    }

    // Shuffle
    lettersList.sort(() => Math.random() - 0.5);

    // Clear any previous bubbles dynamically injected
    // Note: The level-overlay and particles are fine, but clear old bubble DOM elements
    const bubbleElements = playAreaRef.current.querySelectorAll('.bubble');
    bubbleElements.forEach(el => el.remove());

    const createdBubbles = lettersList.map((info, index) => {
      const el = document.createElement('div');
      el.className = 'bubble';
      el.innerText = info.text;

      // Position randomly
      let x = Math.random() * (width - 70) + 35;
      let y = Math.random() * (height - 70) + 35;

      // Adjust boundaries
      if (x < bubbleRadius) x = bubbleRadius;
      if (x > width - bubbleRadius) x = width - bubbleRadius;
      if (y < bubbleRadius) y = bubbleRadius;
      if (y > height - bubbleRadius) y = height - bubbleRadius;

      // Speeds
      const vx = (Math.random() * 0.6 + 0.4) * (Math.random() > 0.5 ? 1 : -1);
      const vy = (Math.random() * 0.6 + 0.4) * (Math.random() > 0.5 ? 1 : -1);

      playAreaRef.current.appendChild(el);

      // Mouse/Tap click listener
      el.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent triggering area miss click
        handleBubbleClick(index);
      });

      return {
        el,
        x,
        y,
        vx,
        vy,
        r: bubbleRadius,
        letter: info.text,
        isTarget: info.isTarget,
        visible: true
      };
    });

    bubblesRef.current = createdBubbles;
  };

  const startGameLoop = () => {
    if (!gameActiveRef.current || !playAreaRef.current) return;

    const width = playAreaRef.current.clientWidth;
    const height = playAreaRef.current.clientHeight;

    const bubbles = bubblesRef.current;

    bubbles.forEach((b) => {
      if (!b.visible) return;

      // Update positions
      b.x += b.vx;
      b.y += b.vy;

      // Boundary collisions (bounces)
      if (b.x - b.r < 0) {
        b.x = b.r;
        b.vx *= -1;
      } else if (b.x + b.r > width) {
        b.x = width - b.r;
        b.vx *= -1;
      }

      if (b.y - b.r < 0) {
        b.y = b.r;
        b.vy *= -1;
      } else if (b.y + b.r > height) {
        b.y = height - b.r;
        b.vy *= -1;
      }

      // Bubble-to-bubble collisions
      bubbles.forEach((other) => {
        if (b === other || !other.visible) return;
        const dx = other.x - b.x;
        const dy = other.y - b.y;
        const distance = Math.hypot(dx, dy);
        const minDist = b.r + other.r;

        if (distance < minDist) {
          const angle = Math.atan2(dy, dx);
          
          // Separate overlapping bubbles
          const overlap = minDist - distance;
          b.x -= Math.cos(angle) * overlap * 0.5;
          b.y -= Math.sin(angle) * overlap * 0.5;

          // Swap velocities
          const tempVx = b.vx;
          const tempVy = b.vy;
          b.vx = other.vx;
          b.vy = other.vy;
          other.vx = tempVx;
          other.vy = tempVy;
        }
      });

      // Render positions in DOM
      b.el.style.left = `${b.x - b.r}px`;
      b.el.style.top = `${b.y - b.r}px`;
    });

    animationFrameRef.current = requestAnimationFrame(startGameLoop);
  };

  const handleAreaMissClick = () => {
    if (!gameActiveRef.current) return;
    triggerMiss();
  };

  const handleBubbleClick = (index) => {
    if (!gameActiveRef.current) return;
    
    const b = bubblesRef.current[index];
    if (!b || !b.visible) return;

    currentClicksRef.current++;

    if (b.isTarget) {
      // Hit
      b.visible = false;
      b.el.style.display = 'none';
      currentHitsRef.current++;
      
      scoreRef.current += 10;
      currentRoundScoreRef.current += 10;
      setScore(scoreRef.current);

      createPopParticles(b.x, b.y);

      // Check if all targets are popped
      const remainingTargets = bubblesRef.current.filter(x => x.isTarget && x.visible);
      if (remainingTargets.length === 0) {
        setTimeout(endRound, 400);
      }
    } else {
      // Distractor hit
      triggerMiss();
    }
  };

  const triggerMiss = () => {
    currentClicksRef.current++;
    currentMissesRef.current++;

    scoreRef.current = Math.max(0, scoreRef.current - 5);
    currentRoundScoreRef.current = Math.max(0, currentRoundScoreRef.current - 5);
    setScore(scoreRef.current);

    // Apply flash and shake animation effects via class injections
    if (playAreaRef.current && gameCardRef.current) {
      playAreaRef.current.classList.add('screen-flash-red');
      gameCardRef.current.classList.add('shake-animation');

      setTimeout(() => {
        if (playAreaRef.current) playAreaRef.current.classList.remove('screen-flash-red');
        if (gameCardRef.current) gameCardRef.current.classList.remove('shake-animation');
      }, 400);
    }
  };

  const createPopParticles = (x, y) => {
    if (!playAreaRef.current) return;

    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('div');
      particle.className = 'pop-particle';
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;

      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 40 + 20;
      const tx = `${Math.cos(angle) * distance}px`;
      const ty = `${Math.sin(angle) * distance}px`;

      particle.style.setProperty('--tx', tx);
      particle.style.setProperty('--ty', ty);

      playAreaRef.current.appendChild(particle);

      setTimeout(() => particle.remove(), 600);
    }
  };

  const endRound = () => {
    stopGameSession();

    // Log metrics
    roundMetricsRef.current.push({
      clicks: currentClicksRef.current,
      hits: currentHitsRef.current,
      misses: currentMissesRef.current,
      score: currentRoundScoreRef.current
    });

    if (currentRoundRef.current < MAX_ROUNDS) {
      currentRoundRef.current++;
      startRound();
    } else {
      endGameSession();
    }
  };

  const endGameSession = () => {
    setScreen('complete');
    
    const count = roundMetricsRef.current.length;
    if (count === 0) return;

    let totalClicks = 0;
    let totalHits = 0;
    let totalMisses = 0;
    let totalScore = 0;

    roundMetricsRef.current.forEach(r => {
      totalClicks += r.clicks;
      totalHits += r.hits;
      totalMisses += r.misses;
      totalScore += r.score;
    });

    const avgClicks = totalClicks / count;
    const avgHits = totalHits / count;
    const avgMisses = totalMisses / count;
    const avgScore = totalScore / count;
    const avgAccuracy = totalClicks > 0 ? (totalHits / totalClicks) : 0;
    const avgMissrate = totalClicks > 0 ? (totalMisses / totalClicks) : 0;

    setSummaryMetrics({
      avgClicks: Number(avgClicks.toFixed(1)),
      avgHits: Number(avgHits.toFixed(1)),
      avgMisses: Number(avgMisses.toFixed(1)),
      avgScore: Number(avgScore.toFixed(1)),
      avgAccuracy: avgAccuracy,
      avgMissrate: avgMissrate
    });
  };

  const handleApply = () => {
    onApplyMetrics(summaryMetrics);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`game-modal ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div 
        ref={gameCardRef}
        className="game-card" 
        onClick={(e) => e.stopPropagation()}
      >
        <button className="btn-close-modal" onClick={onClose}>&times;</button>

        {/* SCREEN 1: Instructions */}
        {screen === 'instructions' && (
          <div className="game-instructions-screen">
            <h2>Hit or Miss Assessment</h2>
            <p>Welcome! This test evaluates visual attention and character processing speeds by targeting letters commonly confused by children with reading challenges (like <strong>b, d, p, q</strong>).</p>
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              padding: '15px',
              borderRadius: '12px',
              marginBottom: '25px',
              textAlign: 'left',
              fontSize: '0.9rem',
              lineHeight: '1.5',
              border: '1px solid rgba(255,255,255,0.1)',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <strong style={{ color: 'var(--accent-primary)' }}>How to Play:</strong>
              <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
                <li>In each round, pop all bubbles containing the <strong>Target Letter</strong> displayed at the top.</li>
                <li>Avoid bubbles containing distractor (lookalike) letters.</li>
                <li>Clicking the background or lookalikes counts as a <strong>Miss</strong>.</li>
                <li>Complete all 5 fast-paced rounds to view and apply your metrics.</li>
              </ul>
            </div>
            <button type="button" className="btn-game-trigger" onClick={startAssessment}>Start Assessment</button>
          </div>
        )}

        {/* SCREEN 2: Active Play */}
        {screen === 'play' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="game-header">
              <div className="game-title">Assessment in Progress</div>
              <div className="game-stats-row">
                <div className="stat-tag">Round: <span>{round}/{MAX_ROUNDS}</span></div>
                <div className="stat-tag">Score: <span>{score}</span></div>
                <div className="stat-tag">Time: <span>{timeLeft}s</span></div>
              </div>
            </div>

            <div className="target-banner">
              Pop bubbles containing the letter: <span className="target-letter">{targetLetter}</span>
            </div>

            <div 
              ref={playAreaRef}
              className="game-play-area" 
              onClick={handleAreaMissClick}
            >
              <div className={`level-overlay ${showLevelOverlay ? 'show' : ''}`}>
                Round {round}
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 3: Complete / Summary */}
        {screen === 'complete' && (
          <div className="game-complete-screen">
            <h2>Assessment Complete!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>
              Here are the average metrics calculated from your gameplay session. You can apply them to the form to perform the prediction.
            </p>

            <div className="summary-grid">
              <div className="summary-item">
                <div className="summary-val">{summaryMetrics.avgClicks}</div>
                <div className="summary-lbl">Avg Clicks</div>
              </div>
              <div className="summary-item">
                <div className="summary-val">{summaryMetrics.avgHits}</div>
                <div className="summary-lbl">Avg Hits</div>
              </div>
              <div className="summary-item">
                <div className="summary-val">{summaryMetrics.avgMisses}</div>
                <div className="summary-lbl">Avg Misses</div>
              </div>
              <div className="summary-item">
                <div className="summary-val">{summaryMetrics.avgScore}</div>
                <div className="summary-lbl">Avg Score</div>
              </div>
              <div className="summary-item">
                <div className="summary-val">{(summaryMetrics.avgAccuracy * 100).toFixed(1)}%</div>
                <div className="summary-lbl">Avg Accuracy</div>
              </div>
              <div className="summary-item">
                <div className="summary-val">{(summaryMetrics.avgMissrate * 100).toFixed(1)}%</div>
                <div className="summary-lbl">Avg Missrate</div>
              </div>
            </div>

            <div className="btn-row">
              <button 
                type="button" 
                className="btn-game-trigger" 
                onClick={handleApply}
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
              >
                Apply Metrics to Form
              </button>
              <button 
                type="button" 
                className="btn-game-trigger" 
                onClick={startAssessment}
                style={{ 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  boxShadow: 'none', 
                  border: '1px solid rgba(255,255,255,0.15)' 
                }}
              >
                Restart Test
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
