import React from 'react';

const Bird = ({ position, rotation, isAngry }) => {
  return (
    <div
      style={{
        position: 'absolute',
        width: '80px',
        height: '56px',
        backgroundImage: `url("/${isAngry ? 'angry-bird' : 'flappy-bird'}.png")`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        top: position,
        left: '50px',
        backgroundColor: 'transparent',
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0.1s, background-image 0.05s ease-in-out',
      }}
    />
  );
};

export default Bird;