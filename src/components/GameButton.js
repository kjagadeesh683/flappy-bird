import React from 'react';

const GameButton = ({ onClick, text }) => (
    <button
        style={{
            padding: '10px 20px',
            fontSize: '20px',
            fontWeight: 'bold',
            backgroundColor: '#4169E1', // Royal Blue
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            boxShadow: '0 4px 0 #1E90FF', // Dodger Blue
            transition: 'all 0.1s ease',
            outline: 'none',
            position: 'relative',
            top: 0,
        }}
        onClick={onClick}
        onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#6495ED'; // Cornflower Blue
            e.target.style.boxShadow = '0 2px 0 #1E90FF';
            e.target.style.top = '2px';
        }}
        onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#4169E1';
            e.target.style.boxShadow = '0 4px 0 #1E90FF';
            e.target.style.top = '0';
        }}
        onMouseDown={(e) => {
            e.target.style.boxShadow = '0 0 0 #1E90FF';
            e.target.style.top = '4px';
        }}
        onMouseUp={(e) => {
            e.target.style.boxShadow = '0 4px 0 #1E90FF';
            e.target.style.top = '0';
        }}
    >
        {text}
    </button>
);

export default GameButton;