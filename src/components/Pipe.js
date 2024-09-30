import React from 'react';

const Pipe = ({ height, position, gap }) => {
  const pipeWidth = 60;
  const pipeEndHeight = 20;

  const pipeStyle = {
    background: 'linear-gradient(90deg, #2ecc71 0%, #27ae60 100%)',
    boxShadow: '2px 0 5px rgba(0, 0, 0, 0.1)',
  };

  return (
    <>
      <div
        style={{
          position: 'absolute',
          width: pipeWidth,
          height: height,
          left: position,
          top: 0,
          ...pipeStyle,
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: pipeWidth + 10,
            height: pipeEndHeight,
            bottom: -pipeEndHeight,
            left: -5,
            ...pipeStyle,
            borderBottomLeftRadius: 5,
            borderBottomRightRadius: 5,
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          width: pipeWidth,
          height: 500 - height - gap,
          left: position,
          bottom: 0,
          ...pipeStyle,
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: pipeWidth + 10,
            height: pipeEndHeight,
            top: -pipeEndHeight,
            left: -5,
            ...pipeStyle,
            borderTopLeftRadius: 5,
            borderTopRightRadius: 5,
          }}
        />
      </div>
    </>
  );
};

export default Pipe;