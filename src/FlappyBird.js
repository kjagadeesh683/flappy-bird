import React, { useState, useEffect, useCallback, useRef } from 'react';
import Bird from './components/Bird';
import Pipe from './components/Pipe';
import GameButton from './components/GameButton';
import { supabase } from './supabase';
import { FaVolumeMute, FaVolumeUp, FaCog } from 'react-icons/fa';

// Keep these at the top
const flapSound = new Audio('/flap.mp3');
const hitSound = new Audio('/hit.mp3');

flapSound.preload = 'auto';
hitSound.preload = 'auto';

// Add these constants near your other constants
const DIFFICULTY_SETTINGS = {
  easy: {
    pipeSpeed: 2.5,
    pipeGap: 170,
    speedIncrement: 0.2,
    label: 'Easy'
  },
  medium: {
    pipeSpeed: 3.5,
    pipeGap: 160,
    speedIncrement: 0.4,
    label: 'Medium'
  },
  hard: {
    pipeSpeed: 4.0,
    pipeGap: 150,
    speedIncrement: 0.6,
    label: 'Hard'
  }
};

// Add these constants after your DIFFICULTY_SETTINGS
const scoreCardStyle = {
  backgroundColor: '#4169E1',
  color: 'white',
  fontSize: '14px',
  padding: '6px 8px',
  borderRadius: '5px',
  boxShadow: '0 2px 0 #1E90FF',
  textAlign: 'left',
  userSelect: 'none',
  minWidth: '120px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  transition: 'all 0.3s ease',
};

const clickableScoreCardStyle = {
  ...scoreCardStyle,
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: '#6495ED',
    boxShadow: '0 4px 0 #1E90FF',
  },
};

function FlappyBird() {
  // Move audioContext and buffers into component as refs
  const audioContextRef = useRef(null);
  const flapBufferRef = useRef(null);
  const hitBufferRef = useRef(null);

  // Add existing state variables
  const [isMuted, setIsMuted] = useState(false);
  const [birdPosition, setBirdPosition] = useState(250);
  const [birdVelocity, setBirdVelocity] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [pipeHeight, setPipeHeight] = useState(200);
  const [pipePosition, setPipePosition] = useState(400);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const savedHighScore = localStorage.getItem('highScore');
    return savedHighScore ? parseInt(savedHighScore, 10) : 0;
  });
  const [gameOver, setGameOver] = useState(false);
  const [birdSpeed, setBirdSpeed] = useState(DIFFICULTY_SETTINGS.easy.pipeSpeed);
  const [birdRotation, setBirdRotation] = useState(0);
  const [clouds, setClouds] = useState([
    { id: 1, x: 400, y: 50, scale: 0.8 },
    { id: 2, x: 700, y: 100, scale: 1.0 },
    { id: 3, x: 1000, y: 150, scale: 0.9 },
    { id: 4, x: 1300, y: 80, scale: 1.1 },
    { id: 5, x: 1600, y: 120, scale: 0.7 },
    { id: 6, x: 1900, y: 60, scale: 0.9 },
    { id: 7, x: 2200, y: 130, scale: 0.8 },
    { id: 8, x: 2500, y: 90, scale: 1.0 },
  ]);
  const lastPipeRef = useRef(400);
  const [isAngryBird, setIsAngryBird] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('skyblue');
  const [gameOverOpacity, setGameOverOpacity] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardOpacity, setLeaderboardOpacity] = useState(0);
  const [showTopLeaderboard, setShowTopLeaderboard] = useState(false);
  const [scale, setScale] = useState(1);
  const gameRef = useRef(null);
  const [globalHighScore, setGlobalHighScore] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [leaderboardFilter, setLeaderboardFilter] = useState('all'); // 'all', 'daily', 'weekly', 'monthly'
  const [showSettings, setShowSettings] = useState(false);

  // Add new state for tracking top 10 status
  const [isInTopTen, setIsInTopTen] = useState(false);

  const [difficulty, setDifficulty] = useState('easy');
  const [currentSettings, setCurrentSettings] = useState(DIFFICULTY_SETTINGS.easy);

  useEffect(() => {
    setCurrentSettings(DIFFICULTY_SETTINGS[difficulty]);
    setBirdSpeed(DIFFICULTY_SETTINGS[difficulty].pipeSpeed);
  }, [difficulty]);

  const toggleMute = () => {
    setIsMuted(prevMuted => {
      const newMutedState = !prevMuted;
      flapSound.muted = newMutedState;
      hitSound.muted = newMutedState;
      return newMutedState;
    });
  };

  // Move initAudioContext inside component
  const initAudioContext = async () => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

      const [flapResponse, hitResponse] = await Promise.all([
        fetch('/flap.mp3'),
        fetch('/hit.mp3')
      ]);

      const [flapData, hitData] = await Promise.all([
        flapResponse.arrayBuffer(),
        hitResponse.arrayBuffer()
      ]);

      [flapBufferRef.current, hitBufferRef.current] = await Promise.all([
        audioContextRef.current.decodeAudioData(flapData),
        audioContextRef.current.decodeAudioData(hitData)
      ]);
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  };

  // Move playSound inside component
  const playSound = (buffer) => {
    if (!audioContextRef.current || !buffer || isMuted) return;

    try {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const GRAVITY = 0.4;
  const JUMP_HEIGHT = 8;
  const PIPE_WIDTH = 60;
  const PIPE_GAP = 200;
  const INITIAL_BIRD_SPEED = 3;
  const MIN_PIPE_HEIGHT = 50;
  const MAX_PIPE_HEIGHT = 300;
  const SPEED_INCREMENT = 0.5;
  const SPEED_INCREMENT_INTERVAL = 5;
  const BIRD_WIDTH = 80;
  const BIRD_HEIGHT = 56;
  const BIRD_LEFT_POSITION = 50;
  const CLOUD_SPEED = 0.5;

  // Update the Cloud component with better performance optimizations
  const Cloud = React.memo(({ x, y, scale }) => (
    <div
      style={{
        position: 'absolute',
        transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
        width: '300px',
        height: '150px',
        backgroundImage: 'url("/clouds.png")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        opacity: 0.8,
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        perspective: 1000,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}
    />
  ));

  const jump = useCallback(() => {
    if (countdown !== null || showTopLeaderboard || showLeaderboard) return;

    if (!audioContextRef.current) {
      initAudioContext();
    }

    if (gameOver) {
      setGameOver(false);
      setScore(0);
      setBirdPosition(250);
      setPipePosition(400);
      setBirdVelocity(0);
      setBirdSpeed(currentSettings.pipeSpeed);
      lastPipeRef.current = 400;
      setIsAngryBird(false);
    }

    if (!gameStarted) setGameStarted(true);
    setBirdVelocity(-JUMP_HEIGHT);
    setBirdRotation(-20);
    setTimeout(() => setBirdRotation(0), 300);

    playSound(flapBufferRef.current);
  }, [gameStarted, gameOver, showTopLeaderboard, showLeaderboard, isMuted, countdown, currentSettings]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' && !showTopLeaderboard && !showLeaderboard) jump();
    };
    document.addEventListener('keypress', handleKeyPress);
    return () => document.removeEventListener('keypress', handleKeyPress);
  }, [jump, showTopLeaderboard, showLeaderboard]);

  useEffect(() => {
    let gameLoop;
    if (gameStarted && !gameOver) {
      gameLoop = setInterval(() => {
        setBirdPosition((position) => {
          const newPosition = position + birdVelocity;
          if (newPosition >= 500 - BIRD_HEIGHT) {
            setGameOver(true);
            setGameStarted(false);
            return 500 - BIRD_HEIGHT;
          }
          return Math.max(newPosition, 0);
        });
        setBirdVelocity((velocity) => Math.min(velocity + GRAVITY, 10));

        setPipePosition((position) => {
          if (position <= -PIPE_WIDTH) {
            const newTopHeight = Math.random() * (MAX_PIPE_HEIGHT - MIN_PIPE_HEIGHT) + MIN_PIPE_HEIGHT;
            setPipeHeight(newTopHeight);
            lastPipeRef.current = 400;
            return 400;
          }
          if (position < BIRD_LEFT_POSITION && lastPipeRef.current >= BIRD_LEFT_POSITION) {
            setScore((s) => {
              const newScore = s + 1;
              if (newScore % SPEED_INCREMENT_INTERVAL === 0) {
                setBirdSpeed((speed) => speed + currentSettings.speedIncrement);
              }
              return newScore;
            });
          }
          lastPipeRef.current = position;
          return position - birdSpeed;
        });

        setBackgroundColor(`hsl(200, 100%, ${Math.max(50, 80 - score)}%)`);
      }, 20);
    }
    return () => clearInterval(gameLoop);
  }, [gameStarted, birdVelocity, gameOver, currentSettings]);

  // Update handleGameOver to use the refs
  const handleGameOver = useCallback(async () => {
    setGameStarted(false);
    setGameOver(true);
    setIsAngryBird(true);

    // Check if score is in daily top 10
    const isTop10 = await isScoreInTopTen(score);
    setIsInTopTen(isTop10);

    if (!isMuted) {
      playSound(hitBufferRef.current);
    }
    setShowLeaderboard(true);
  }, [isMuted, score]);

  useEffect(() => {
    const birdRightEdge = BIRD_LEFT_POSITION + BIRD_WIDTH;
    const birdBottomEdge = birdPosition + BIRD_HEIGHT;
    const pipeRightEdge = pipePosition + PIPE_WIDTH;

    const collisionBuffer = 5;
    const topPipeCollision = birdPosition < pipeHeight - collisionBuffer;
    const bottomPipeCollision = birdBottomEdge > pipeHeight + PIPE_GAP + collisionBuffer;

    if (
      birdPosition <= 0 ||
      birdBottomEdge >= 500 ||
      (birdRightEdge > pipePosition + collisionBuffer &&
        BIRD_LEFT_POSITION < pipeRightEdge - collisionBuffer &&
        (topPipeCollision || bottomPipeCollision))
    ) {
      handleGameOver();
    }
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('highScore', score.toString());
    }
  }, [birdPosition, pipeHeight, pipePosition, score, highScore, handleGameOver]);

  // Update the cloud movement useEffect
  useEffect(() => {
    let animationFrameId;
    let lastTimestamp = 0;
    const FPS = 60;
    const frameInterval = 1000 / FPS;

    const updateClouds = (timestamp) => {
      if (gameStarted && !gameOver) {
        if (timestamp - lastTimestamp >= frameInterval) {
          setClouds(prevClouds =>
            prevClouds.map(cloud => ({
              ...cloud,
              x: cloud.x <= -300 ? window.innerWidth + Math.random() * 200 : cloud.x - CLOUD_SPEED,
            }))
          );
          lastTimestamp = timestamp;
        }
        animationFrameId = requestAnimationFrame(updateClouds);
      }
    };

    if (gameStarted && !gameOver) {
      animationFrameId = requestAnimationFrame(updateClouds);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [gameStarted, gameOver]);

  useEffect(() => {
    if (gameOver) {
      let opacity = 0;
      const fadeIn = setInterval(() => {
        opacity += 0.1;
        setGameOverOpacity(opacity);
        if (opacity >= 1) clearInterval(fadeIn);
      }, 50);
      return () => clearInterval(fadeIn);
    }
  }, [gameOver]);

  useEffect(() => {
    if (showLeaderboard) {
      let opacity = 0;
      const fadeIn = setInterval(() => {
        opacity += 0.1;
        setLeaderboardOpacity(opacity);
        if (opacity >= 1) clearInterval(fadeIn);
      }, 50);
      return () => clearInterval(fadeIn);
    }
  }, [showLeaderboard]);

  const pipeStyle = useCallback((position) => ({
    transform: `translateX(${position}px) rotate(${Math.sin(position * 0.05) * 2}deg)`,
  }), []);

  const submitScore = async (e) => {
    e.preventDefault();
    if (playerName.trim() === '') return;

    try {
      console.log('Submitting score:', { name: playerName.trim(), score });
      const { data, error } = await supabase
        .from('leaderboard')
        .insert([{
          name: playerName.trim(),
          score: score,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      console.log('Score submitted successfully:', data);
      setShowLeaderboard(false);
      setPlayerName('');
      setShowTopLeaderboard(true);
      await fetchLeaderboard();
      await fetchGlobalHighScore();
    } catch (error) {
      console.error('Error submitting score:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      console.log('Fetching leaderboard...');
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Supabase error:', error.message, error.details, error.hint);
        throw error;
      }

      console.log('Leaderboard fetched successfully:', data);
      setLeaderboard(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error.message, error);
      // You might want to show an error message to the user here
    }
  };

  const fetchGlobalHighScore = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('score')
        .order('score', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      setGlobalHighScore(data.score);
    } catch (error) {
      console.error('Error fetching global high score:', error.message);
    }
  };

  useEffect(() => {
    if (showLeaderboard) {
      fetchLeaderboard();
    }
  }, [showLeaderboard]);

  useEffect(() => {
    fetchGlobalHighScore();
  }, []);

  // Add this new useEffect for handling responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (gameRef.current) {
        const gameWidth = 400;
        const gameHeight = 500;
        const gameAspectRatio = gameWidth / gameHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const windowAspectRatio = windowWidth / windowHeight;

        let newScale;
        let maxScale = 1.5; // Increased maximum scale

        if (windowAspectRatio > gameAspectRatio) {
          // Window is wider than the game
          newScale = (windowHeight * 0.95) / gameHeight; // Use 95% of the window height
        } else {
          // Window is taller than the game
          newScale = (windowWidth * 0.95) / gameWidth; // Use 95% of the window width
        }

        // Limit the scale
        newScale = Math.min(newScale, maxScale);
        newScale = Math.max(newScale, 1); // Ensure the game is never smaller than its original size

        setScale(newScale);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleGlobalScoreClick = () => {
    setShowTopLeaderboard(true);
    fetchLeaderboard();
  };

  const fetchFilteredLeaderboard = async (filter) => {
    try {
      let query = supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

      // Add date filtering
      const now = new Date();
      if (filter === 'daily') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte('created_at', today);
      } else if (filter === 'weekly') {
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', weekAgo);
      } else if (filter === 'monthly') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();
        query = query.gte('created_at', monthAgo);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLeaderboard(data);
    } catch (error) {
      console.error('Error fetching filtered leaderboard:', error.message);
    }
  };

  const settingsButtonStyle = {
    width: '50px',
    height: '50px',
    padding: 0,
    minWidth: 'unset',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '28px',
    backgroundColor: '#4169E1',
    boxShadow: '0 4px 0 #1E90FF',
    border: 'none',
    borderRadius: '10px',
    transition: 'all 0.1s ease',
    marginLeft: '10px',
  };

  // Update the isScoreInTopTen function to check daily scores
  const isScoreInTopTen = async (newScore) => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const { data, error } = await supabase
        .from('leaderboard')
        .select('score')
        .gte('created_at', today)
        .order('score', { ascending: false })
        .limit(10);

      if (error) throw error;

      // If there are less than 10 scores today, new score will be in top 10
      if (data.length < 10) return true;

      // Check if new score is higher than the lowest score in today's top 10
      const lowestTopScore = data[data.length - 1].score;
      return newScore > lowestTopScore;
    } catch (error) {
      console.error('Error checking daily top scores:', error);
      return false;
    }
  };

  // Add new state for difficulty modal
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);

  // Add this state to track where the leaderboard was opened from
  const [leaderboardOpenedFromSettings, setLeaderboardOpenedFromSettings] = useState(false);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#87CEEB',
      overflow: 'hidden',
      margin: 0,
      padding: 0,
    }}>
      <div
        ref={gameRef}
        style={{
          width: '400px',
          height: '500px',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          backgroundColor: '#87CEEB',
          position: 'relative',
          overflow: 'hidden',
          border: '2px solid #333',
          borderRadius: '10px',
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.1)',
        }}
        onClick={gameStarted ? jump : undefined}
      >
        {!gameStarted && !gameOver && !countdown && (
          <>
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              zIndex: 1000,
            }}>
              <div style={scoreCardStyle}>
                <span>Best Score: {highScore}</span>
              </div>
              <div style={clickableScoreCardStyle}>
                <span>Global High Score: {globalHighScore}</span>
              </div>
            </div>
          </>
        )}
        {(gameStarted || gameOver) && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
          }}>
            <div style={scoreCardStyle}>
              <span>Current Score: {score}</span>
            </div>
            <div style={scoreCardStyle}>
              <span>Best Score: {highScore}</span>
            </div>
          </div>
        )}
        {!gameStarted && !gameOver && !countdown && score === 0 && (
          <>
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              zIndex: 1000,
            }}>
              <div style={scoreCardStyle}>
                <span>Best Score: {highScore}</span>
              </div>
              <div style={clickableScoreCardStyle}>
                <span>Global High Score: {globalHighScore}</span>
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                transform: `scale(${1 / scale})`,
                transformOrigin: 'top right',
                zIndex: 1000,
                display: 'flex',
                gap: '10px',
              }}
            >
              <GameButton
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                text={isMuted ? <FaVolumeMute size={24} /> : <FaVolumeUp size={24} />}
                style={settingsButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#6495ED';
                  e.currentTarget.style.boxShadow = '0 2px 0 #1E90FF';
                  e.currentTarget.style.transform = 'translateY(2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#4169E1';
                  e.currentTarget.style.boxShadow = '0 4px 0 #1E90FF';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              />
              <GameButton
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettings(true);
                }}
                text={<FaCog size={24} />}
                style={settingsButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#6495ED';
                  e.currentTarget.style.boxShadow = '0 2px 0 #1E90FF';
                  e.currentTarget.style.transform = 'translateY(2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#4169E1';
                  e.currentTarget.style.boxShadow = '0 4px 0 #1E90FF';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              />
            </div>
          </>
        )}
        {gameStarted && clouds.map(cloud => (
          <Cloud key={cloud.id} x={cloud.x} y={cloud.y} scale={cloud.scale} />
        ))}
        {!gameStarted && !gameOver && (
          <div
            style={{
              position: 'absolute',
              top: '30%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '80%',
              textAlign: 'center',
            }}
          >
            <img src="/gamename.png" alt="Flappy Bird" style={{ maxWidth: '100%' }} />
            <div style={{
              color: 'white',
              fontSize: '16px',
              marginTop: '10px',
              padding: '5px 10px',
              backgroundColor: '#4169E1',
              borderRadius: '15px',
              display: 'inline-block',
            }}>
              {DIFFICULTY_SETTINGS[difficulty].label} Mode
            </div>
          </div>
        )}
        {countdown !== null && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '72px',
            fontWeight: 'bold',
            color: 'white',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            zIndex: 1000,
          }}>
            {countdown}
          </div>
        )}
        <Bird position={birdPosition} rotation={birdRotation} isAngry={isAngryBird} />
        {(gameStarted || gameOver) && countdown === null && (
          <Pipe 
            height={pipeHeight} 
            position={pipePosition} 
            gap={currentSettings.pipeGap} 
            style={pipeStyle(pipePosition)} 
          />
        )}
        {!gameStarted && !gameOver && !countdown && (
          <div
            style={{
              position: 'absolute',
              top: '80%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {score === 0 && <GameButton onClick={jump} text="CLICK TO START" />}
          </div>
        )}
        {gameOver && showLeaderboard && !showTopLeaderboard && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: `rgba(0, 0, 0, ${leaderboardOpacity * 0.7})`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'white',
              fontFamily: 'Arial, sans-serif',
              opacity: leaderboardOpacity,
              transition: 'opacity 0.5s ease-in-out',
              padding: '40px 0',
              zIndex: 1000,
            }}
          >
            <h2 style={{
              color: 'red',
              fontSize: '36px',
              marginBottom: '30px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}>
              Game Over
            </h2>
            <div style={{ fontSize: '24px', marginBottom: '30px' }}>
              Your Score: {score}
            </div>

            {isInTopTen ? (
              <>
                <h3 style={{
                  color: 'white',
                  fontSize: '28px',
                  marginBottom: '30px',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                }}>
                  You're on the Leaderboard!
                </h3>
                <div style={{
                  marginBottom: '30px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '80%',
                  maxWidth: '300px',
                  gap: '20px'
                }}>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    style={{
                      padding: '10px',
                      fontSize: '16px',
                      width: '100%',
                      borderRadius: '5px',
                      border: 'none',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    }}
                  />
                  <GameButton
                    onClick={submitScore}
                    text="Submit"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '16px',
                      backgroundColor: '#4169E1',
                      boxShadow: '0 4px 0 #1E90FF',
                    }}
                  />
                </div>
              </>
            ) : (
              <div style={{
                display: 'flex',
                gap: '15px',
                marginTop: '20px',
              }}>
                <GameButton
                  onClick={() => {
                    setShowLeaderboard(false);
                    setBirdPosition(250);
                    setPipePosition(400);
                    setBirdVelocity(0);
                    setBirdSpeed(currentSettings.pipeSpeed);
                    setScore(0);
                    setIsAngryBird(false);
                    setGameOver(false);

                    // Start countdown
                    setCountdown(3);
                    const countdownInterval = setInterval(() => {
                      setCountdown(prev => {
                        if (prev === 1) {
                          clearInterval(countdownInterval);
                          setTimeout(() => {
                            setCountdown(null);
                            setGameStarted(true);
                          }, 500);
                          return "GO!";
                        }
                        return prev - 1;
                      });
                    }, 1000);
                  }}
                  text="Play Again"
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                  }}
                />
                <GameButton
                  onClick={() => {
                    setShowLeaderboard(false);
                    setGameStarted(false);
                    setGameOver(false);
                    setBirdPosition(250);
                    setPipePosition(400);
                    setBirdVelocity(0);
                    setBirdSpeed(currentSettings.pipeSpeed);
                    setScore(0);
                    setIsAngryBird(false);
                    setClouds(prevClouds => prevClouds.map(cloud => ({
                      ...cloud,
                      x: 400 + Math.random() * 2100
                    })));
                  }}
                  text="Back to Home"
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {showTopLeaderboard && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'black',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 2000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '90%',
                maxWidth: '320px',
                backgroundColor: '#1a1a2e',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '2px solid #4169E1',
              }}
            >
              <div style={{
                backgroundColor: '#4169E1',
                padding: '10px',
                textAlign: 'center',
              }}>
                <h2 style={{
                  color: 'white',
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}>
                  Leaderboard
                </h2>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '2px',
                padding: '8px',
                backgroundColor: '#4169E1',
              }}>
                {['all', 'daily', 'weekly', 'monthly'].map((filter) => (
                  <GameButton
                    key={filter}
                    onClick={() => {
                      setLeaderboardFilter(filter);
                      fetchFilteredLeaderboard(filter);
                    }}
                    text={filter.charAt(0).toUpperCase() + filter.slice(1)}
                    style={{
                      padding: '6px 0',
                      fontSize: '12px',
                      backgroundColor: leaderboardFilter === filter ? '#4169E1' : '#2d4ba1',
                      border: leaderboardFilter === filter ? '2px solid white' : 'none',
                      borderRadius: '6px',
                    }}
                  />
                ))}
              </div>

              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                padding: '8px',
                backgroundColor: '#1a1a2e',
              }}>
                {leaderboard.length > 0 ? (
                  leaderboard.map((entry, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      margin: '2px 0',
                      backgroundColor: index % 2 === 0 ? 'rgba(65, 105, 225, 0.15)' : 'rgba(65, 105, 225, 0.05)',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '14px',
                    }}>
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        <strong style={{ minWidth: '20px' }}>
                          {index + 1}.
                        </strong>
                        {entry.name}
                      </span>
                      <span style={{ fontWeight: 'bold' }}>
                        {entry.score}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{
                    color: 'white',
                    textAlign: 'center',
                    padding: '15px',
                    fontSize: '14px',
                    opacity: 0.7,
                  }}>
                    No scores yet for this period
                  </div>
                )}
              </div>

              <div style={{
                padding: '8px',
                backgroundColor: '#1a1a2e',
                borderTop: '1px solid rgba(65, 105, 225, 0.3)',
              }}>
                <GameButton
                  onClick={() => {
                    setShowTopLeaderboard(false);
                    if (leaderboardOpenedFromSettings) {  // Check if opened from settings
                      setShowSettings(true);
                      setLeaderboardOpenedFromSettings(false);  // Reset the flag
                    } else {
                      setShowLeaderboard(false);
                      setGameStarted(false);
                      setGameOver(false);
                      setBirdPosition(250);
                      setPipePosition(400);
                      setBirdVelocity(0);
                      setBirdSpeed(INITIAL_BIRD_SPEED);
                      setScore(0);
                      setIsAngryBird(false);
                      setPlayerName('');
                    }
                  }}
                  text={leaderboardOpenedFromSettings ? "Back" : "Close"}  // Change text based on where it was opened from
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '14px',
                    backgroundColor: '#FF0000',
                    boxShadow: '0 3px 0 #CC0000',
                    borderRadius: '6px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FF3333';
                    e.currentTarget.style.boxShadow = '0 2px 0 #CC0000';
                    e.currentTarget.style.transform = 'translateY(1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FF0000';
                    e.currentTarget.style.boxShadow = '0 3px 0 #CC0000';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                />
              </div>
            </div>
          </div>
        )}
        {showSettings && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'black',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 2000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                backgroundColor: '#1a1a2e',
                padding: '20px',
                borderRadius: '15px',
                width: '80%',
                maxWidth: '300px',
                border: '2px solid #4169E1',
              }}
            >
              <h2 style={{
                color: 'white',
                textAlign: 'center',
                marginBottom: '20px',
                fontSize: '24px',
              }}>
                Settings
              </h2>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
              }}>
                <GameButton
                  onClick={() => {
                    setShowDifficultyModal(true);
                    setShowSettings(false);
                  }}
                  text="Game Mode"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                  }}
                />
                <GameButton
                  onClick={() => {
                    setShowSettings(false);
                    setShowTopLeaderboard(true);
                    setLeaderboardOpenedFromSettings(true);  // Set this flag when opening from settings
                    fetchLeaderboard();
                  }}
                  text="Leaderboard"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                  }}
                />
                <GameButton
                  onClick={() => setShowSettings(false)}
                  text="Close"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    backgroundColor: '#FF0000',
                    boxShadow: '0 4px 0 #CC0000',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FF3333';
                    e.currentTarget.style.boxShadow = '0 2px 0 #CC0000';
                    e.currentTarget.style.transform = 'translateY(2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FF0000';
                    e.currentTarget.style.boxShadow = '0 4px 0 #CC0000';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                />
              </div>
            </div>
          </div>
        )}
        {/* Add new Difficulty Modal */}
        {showDifficultyModal && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'black',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 2000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                backgroundColor: '#1a1a2e',
                padding: '20px',
                borderRadius: '15px',
                width: '80%',
                maxWidth: '300px',
                border: '2px solid #4169E1',
              }}
            >
              <h2 style={{
                color: 'white',
                textAlign: 'center',
                marginBottom: '20px',
                fontSize: '24px',
              }}>
                Game Mode
              </h2>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                marginBottom: '20px',
              }}>
                {Object.keys(DIFFICULTY_SETTINGS).map((level) => (
                  <GameButton
                    key={level}
                    onClick={() => {
                      setDifficulty(level);
                      setShowDifficultyModal(false);
                      setShowSettings(true);
                    }}
                    text={DIFFICULTY_SETTINGS[level].label}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '16px',
                      backgroundColor: difficulty === level ? '#4169E1' : '#2d4ba1',
                      border: difficulty === level ? '2px solid white' : 'none',
                    }}
                  />
                ))}
              </div>

              <GameButton
                onClick={() => {
                  setShowDifficultyModal(false);
                  setShowSettings(true);
                }}
                text="Back"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  backgroundColor: '#FF0000',
                  boxShadow: '0 4px 0 #CC0000',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FF3333';
                  e.currentTarget.style.boxShadow = '0 2px 0 #CC0000';
                  e.currentTarget.style.transform = 'translateY(2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FF0000';
                  e.currentTarget.style.boxShadow = '0 4px 0 #CC0000';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FlappyBird;
