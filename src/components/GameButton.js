import React from 'react';

const GameButton = ({ onClick, text, style, isMuteButton = false, ...props }) => (
  <button
    style={{
      padding: '10px',
      fontSize: '20px',
      fontWeight: 'bold',
      backgroundColor: '#4169E1',    // Royal Blue
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      boxShadow: isMuteButton ? 'none' : '0 4px 0 #1E90FF',
      transition: 'all 0.1s ease',
      outline: 'none',
      position: 'relative',
      display: 'flex',                // Use flex to center the icon
      justifyContent: 'center',
      alignItems: 'center',
      ...style,
    }}
    onClick={onClick}
    onMouseEnter={(e) => {
      if (!isMuteButton) {
        e.target.style.backgroundColor = '#6495ED';  // Cornflower Blue
        e.target.style.boxShadow = '0 2px 0 #1E90FF';
      }
    }}
    onMouseLeave={(e) => {
      if (!isMuteButton) {
        e.target.style.backgroundColor = '#4169E1';
        e.target.style.boxShadow = '0 4px 0 #1E90FF';
      }
    }}
    onMouseDown={(e) => {
      if (!isMuteButton) {
        e.preventDefault(); // Prevent default button behavior
        e.target.style.boxShadow = '0 0 0 #1E90FF';
      }
    }}
    onMouseUp={(e) => {
      if (!isMuteButton) {
        e.target.style.boxShadow = '0 4px 0 #1E90FF';
      }
    }}
    {...props}
  >
    {text}
  </button>
);

export default GameButton;
