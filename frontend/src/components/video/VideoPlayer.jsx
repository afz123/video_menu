import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export const VideoPlayer = ({
  lqip,
  poster,
  videoSrc,
  isCurrent = true,
  enableSoundToggle = true,
  onDoubleTap
}) => {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;
    const video = videoRef.current;
    if (!video) return;

    if (isCurrent) {
      try {
        video.currentTime = 0;
      } catch (_) {}

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (isCancelled && video) {
              video.pause();
            }
          })
          .catch(() => {
            if (isCancelled) return;
            if (video) {
              video.muted = true;
              setIsMuted(true);
              video.play().catch(() => {});
            }
          });
      }
    } else {
      video.pause();
    }

    return () => {
      isCancelled = true;
    };
  }, [isCurrent]);

  const toggleSound = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#000',
        userSelect: 'none'
      }}
    >
      {/* 1. Fast LQIP layer (micro WebP blur) */}
      {!isVideoLoaded && lqip && (
        <img
          src={lqip}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
            transition: 'opacity 0.4s ease'
          }}
        />
      )}

      {/* 2. HD Poster (with subtle cinematic slow-zoom if static photo) */}
      {!isVideoLoaded && poster && (
        <img
          src={poster}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: !videoSrc && isCurrent ? 'scale(1.04)' : 'scale(1)',
            transition: 'transform 7s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.5s ease'
          }}
        />
      )}

      {/* 3. Ultra Fast-Start Video Loop */}
      {videoSrc && (
        <video
          ref={videoRef}
          src={videoSrc}
          loop
          muted={isMuted}
          playsInline
          webkit-playsinline="true"
          preload="auto"
          onPlaying={() => setIsVideoLoaded(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: isVideoLoaded ? 1 : 0,
            transition: 'opacity 0.6s ease'
          }}
        />
      )}

      {/* Cinematic dark gradients for legibility */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.6) 100%)',
          pointerEvents: 'none'
        }}
      />

      {/* Sound toggle button (ASMR Audio) */}
      {enableSoundToggle && videoSrc && (
        <button
          onClick={toggleSound}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 30,
            background: 'rgba(10, 10, 12, 0.65)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border-subtle)',
            borderRadius: '50%',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isMuted ? 'var(--text-muted)' : 'var(--accent-gold)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title={isMuted ? 'Включить ASMR звук' : 'Выключить звук'}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      )}
    </div>
  );
};
