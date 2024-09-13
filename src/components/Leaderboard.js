import React from 'react';
import GameButton from './GameButton';

const Leaderboard = ({ scores, onClose }) => (
  <div style={{
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  }}>
    <h2 style={{ color: 'white', fontSize: '32px', marginBottom: '20px' }}>Leaderboard</h2>
    <ul style={{ listStyleType: 'none', padding: 0, width: '80%', maxWidth: '300px' }}>
      {scores.map((score, index) => (
        <li key={index} style={{ 
          margin: '10px 0', 
          padding: '10px', 
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '5px',
          display: 'flex',
          justifyContent: 'space-between',
          color: 'white',
          fontSize: '18px'
        }}>
          <span>{index + 1}. {score.name}</span>
          <span>{score.score}</span>
        </li>
      ))}
    </ul>
    <GameButton onClick={onClose} text="CLOSE" />
  </div>
);

export default Leaderboard;