import React from 'react';

export const VideoBackground = ({ videoSrc, poster, overlayOpacity = 0.5 }) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        zIndex: 0
      }}
    >
      {videoSrc ? (
        <video
          src={videoSrc}
          poster={poster}
          autoPlay
          loop
          muted
          playsInline
          webkit-playsinline="true"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : poster ? (
        <img
          src={poster}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'var(--bg-core)' }} />
      )}

      {/* Dark overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `rgba(9, 9, 11, ${overlayOpacity})`
        }}
      />
    </div>
  );
};
