import React, { useState, useEffect, useCallback, useRef } from 'react';
import Bird from './components/Bird';
import Pipe from './components/Pipe';
import GameButton from './components/GameButton';
import { supabase } from './supabase';
import { FaVolumeMute, FaVolumeUp } from 'react-icons/fa';

// Add these lines at the top of the file, outside the component
const flapSound = new Audio('/flap.mp3');
const hitSound = new Audio('/hit.mp3');

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

const Cloud = ({ x, y, scale }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: `${300 * scale}px`,
      height: `${150 * scale}px`,
      backgroundImage: 'url("/clouds.png")',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      opacity: 0.8,
    }}
  />
);

function FlappyBird() {
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
  const [birdSpeed, setBirdSpeed] = useState(INITIAL_BIRD_SPEED);
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
  const [isMuted, setIsMuted] = useState(false);
  const [scale, setScale] = useState(1);
  const gameRef = useRef(null);
  const [globalHighScore, setGlobalHighScore] = useState(0);
  const [countdown, setCountdown] = useState(null);

  const toggleMute = () => {
    setIsMuted(prevMuted => {
      const newMutedState = !prevMuted;
      flapSound.muted = newMutedState;
      hitSound.muted = newMutedState;
      return newMutedState;
    });
  };

  const jump = useCallback(() => {
    if (countdown !== null || showTopLeaderboard || showLeaderboard) return;
    if (gameOver) {
      setGameOver(false);
      setScore(0);
      setBirdPosition(250);
      setPipePosition(400);
      setBirdVelocity(0);
      setBirdSpeed(INITIAL_BIRD_SPEED);
      lastPipeRef.current = 400;
      setIsAngryBird(false);
    }
    if (!gameStarted) setGameStarted(true);
    setBirdVelocity(-JUMP_HEIGHT);
    setBirdRotation(-20);
    setTimeout(() => setBirdRotation(0), 300);

    if (!isMuted) {
      flapSound.currentTime = 0;
      flapSound.play();
    }
  }, [gameStarted, gameOver, showTopLeaderboard, showLeaderboard, isMuted, countdown]);

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
                setBirdSpeed((speed) => speed + SPEED_INCREMENT);
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
  }, [gameStarted, birdVelocity, gameOver, birdSpeed, score]);

  const handleGameOver = useCallback(() => {
    setGameStarted(false);
    setGameOver(true);
    setIsAngryBird(true);
    if (!isMuted) {
      hitSound.play();
    }
    setShowLeaderboard(true);
  }, [isMuted]);

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

  useEffect(() => {
    if (gameStarted && !gameOver) {
      const cloudInterval = setInterval(() => {
        setClouds(prevClouds =>
          prevClouds.map(cloud => ({
            ...cloud,
            x: cloud.x <= -300 * cloud.scale ? 400 + Math.random() * 200 : cloud.x - CLOUD_SPEED,
          }))
        );
      }, 20);

      return () => clearInterval(cloudInterval);
    }
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
      console.log('Submitting score:', { name: playerName.trim(), score: score });
      const { data, error } = await supabase
        .from('leaderboard')
        .insert({ name: playerName.trim(), score: score })
        .select();

      if (error) {
        console.error('Supabase error:', error.message, error.details, error.hint);
        throw error;
      }

      console.log('Score submitted successfully:', data);
      await fetchLeaderboard();
      setPlayerName(''); // Clear the input field after submission
      setShowTopLeaderboard(true); // Show the top 10 leaderboard after submission
      await fetchGlobalHighScore(); // Refresh the global high score after submitting
    } catch (error) {
      console.error('Error submitting score:', error.message, error);
      // You might want to show an error message to the user here
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
        const gameAspectRatio = 400 / 500;
        const windowAspectRatio = window.innerWidth / window.innerHeight;

        let newScale;
        if (windowAspectRatio > gameAspectRatio) {
          newScale = window.innerHeight / 500;
        } else {
          newScale = window.innerWidth / 400;
        }

        // Limit the scale to a reasonable range, e.g., 0.5 to 2
        newScale = Math.max(0.5, Math.min(newScale, 2));

        setScale(newScale);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scoreCardStyle = {
    backgroundColor: 'rgb(65, 105, 225)',
    color: 'white',
    fontSize: '14px',
    padding: '6px 8px',
    borderRadius: '5px',
    boxShadow: 'rgb(30, 144, 255) 0px 2px 0px',
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

  const handleGlobalScoreClick = () => {
    setShowTopLeaderboard(true);
    fetchLeaderboard();
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#87CEEB', // Light sky blue background
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
          backgroundColor: '#87CEEB', // Light sky blue background
          position: 'relative',
          overflow: 'hidden',
          border: '2px solid #333',
          borderRadius: '10px',
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.1)',
        }}
        onClick={gameStarted ? jump : undefined}
      >
        {!gameStarted && !gameOver && !countdown && (
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
            <div style={scoreCardStyle}>
              <span>Global High Score: {globalHighScore}</span>
            </div>
          </div>
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
        {!gameStarted && !gameOver && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              transform: `scale(${1 / scale})`,
              transformOrigin: 'top right',
              zIndex: 1000, // Ensure it's above other elements
            }}
          >
            <GameButton
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              text={isMuted ? <FaVolumeMute size={24} /> : <FaVolumeUp size={24} />}
              style={{
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
              }}
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
          <Pipe height={pipeHeight} position={pipePosition} gap={PIPE_GAP} style={pipeStyle(pipePosition)} />
        )}
        {!gameStarted && !gameOver && (
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
            <GameButton onClick={jump} text="CLICK TO START" />
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
              justifyContent: 'space-around',
              alignItems: 'center',
              color: 'white',
              fontFamily: 'Arial, sans-serif',
              opacity: leaderboardOpacity,
              transition: 'opacity 0.5s ease-in-out',
              padding: '40px 0',
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
            <h3 style={{
              color: 'white',
              fontSize: '28px',
              marginBottom: '30px',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
            }}>
              You're on the Leaderboard!
            </h3>
            <form onSubmit={submitScore} style={{
              marginBottom: '30px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '80%',
            }}>
              <div style={{
                marginBottom: '20px',
                fontSize: '24px',
              }}>
                Enter your name:
              </div>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                style={{
                  padding: '10px',
                  width: '80%',
                  marginBottom: '20px',
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '18px',
                }}
              />
              <GameButton onClick={submitScore} text="Submit" />
            </form>
            <div style={{ fontSize: '24px', marginBottom: '30px' }}>
              Your Score: {score}
            </div>
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
              backgroundColor: `rgba(0, 0, 0, ${leaderboardOpacity * 0.8})`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: 'white',
              fontFamily: 'Arial, sans-serif',
              opacity: leaderboardOpacity,
              transition: 'opacity 0.5s ease-in-out',
              padding: '20px',
            }}
          >
            <div style={{
              backgroundColor: '#4169E1',
              color: 'white',
              fontSize: '28px',
              padding: '10px 20px',
              borderRadius: '5px',
              boxShadow: '0 4px 0 #1E90FF',
              marginBottom: '20px',
              textAlign: 'center',
              userSelect: 'none',
              cursor: 'default',
            }}>
              Top 10 Leaderboard
            </div>
            <div style={{
              width: '100%',
              maxWidth: '300px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '15px',
              boxShadow: '0 0 10px rgba(255, 255, 255, 0.2)',
              overflowY: 'auto',
              maxHeight: '60%',
            }}>
              {leaderboard.map((entry, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: index < leaderboard.length - 1 ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    <span style={{
                      width: '30px',
                      fontSize: '18px',
                      color: 'white',
                    }}>
                      {`${index + 1}.`}
                    </span>
                    <span style={{
                      fontSize: '18px',
                      marginLeft: '10px',
                      color: 'white',
                    }}>
                      {entry.name}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: 'white',
                  }}>
                    {entry.score}
                  </span>
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '20px',
              marginTop: '20px',
            }}>
              <GameButton
                onClick={() => {
                  setShowTopLeaderboard(false);
                  setShowLeaderboard(false);
                  setBirdPosition(250);
                  setPipePosition(400);  // Reset pipe position
                  setBirdVelocity(0);
                  setBirdSpeed(INITIAL_BIRD_SPEED);
                  setScore(0);
                  setIsAngryBird(false);

                  // Start the countdown
                  setCountdown(3);

                  const countdownInterval = setInterval(() => {
                    setCountdown(prev => {
                      if (prev === 1) {
                        clearInterval(countdownInterval);
                        setTimeout(() => {
                          setCountdown(null);
                          setGameStarted(true);
                          setGameOver(false);
                        }, 1000); // Show "GO!" for 1 second
                        return "GO!";
                      }
                      return prev - 1;
                    });
                  }, 1000);
                }}
                text="Play Again"
                style={{
                  fontSize: '20px',
                  padding: '10px 20px',
                  backgroundColor: '#4169E1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                }}
              />
              <GameButton
                onClick={() => {
                  setShowTopLeaderboard(false);
                  setShowLeaderboard(false);
                  setGameStarted(false);
                  setGameOver(false);
                  setBirdPosition(250);
                  setPipePosition(400);
                  setBirdVelocity(0);
                  setBirdSpeed(INITIAL_BIRD_SPEED);
                  setScore(0);
                  setIsAngryBird(false);
                  // Reset cloud positions
                  setClouds(prevClouds => prevClouds.map(cloud => ({
                    ...cloud,
                    x: 400 + Math.random() * 2100
                  })));
                }}
                text="Back to Home"
                style={{
                  fontSize: '20px',
                  padding: '10px 20px',
                  backgroundColor: '#4169E1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
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
