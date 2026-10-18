import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

let globalAudioUnlocked = false;

const unlockAudioContext = () => {
  if (globalAudioUnlocked || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      ctx.resume().then(() => {
        globalAudioUnlocked = true;
      }).catch(() => {});
    }
  } catch (_) {}
};

if (typeof window !== 'undefined') {
  const onFirstInteraction = () => {
    unlockAudioContext();
    window.removeEventListener('touchstart', onFirstInteraction);
    window.removeEventListener('click', onFirstInteraction);
  };
  window.addEventListener('touchstart', onFirstInteraction, { passive: true, once: true });
  window.addEventListener('click', onFirstInteraction, { passive: true, once: true });
}

export const VideoPlayer = ({
  lqip,
  poster,
  videoSrc,
  isCurrent = true,
  enableSoundToggle = true,
  isSoundEnabled = false,
  onToggleSound,
  onDoubleTap
}) => {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [localMuted, setLocalMuted] = useState(true);
  const videoRef = useRef(null);

  const effectiveMuted = onToggleSound ? !isSoundEnabled : localMuted;

  // Sync mute state with current audio mode
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = effectiveMuted;
  }, [effectiveMuted]);

  // Hardware lifecycle for video element: aggressively release decoded video memory buffers on inactive slides to prevent WebKit OOM crash on iOS Safari
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isSubscribed = true;

    if (isCurrent && videoSrc) {
      if (video.src !== videoSrc) {
        video.src = videoSrc;
        video.load();
      }
      video.muted = effectiveMuted;
      video.currentTime = 0;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (isSubscribed) setIsVideoLoaded(true);
          })
          .catch(() => {
            // If autoplay with sound is blocked by mobile browser policy, fall back to muted
            if (isSubscribed && video) {
              video.muted = true;
              video.play().catch(() => {});
            }
          });
      }
    } else {
      video.pause();
      setIsVideoLoaded(false);
      // Aggressive video buffer purge for inactive slides
      if (video.src) {
        video.removeAttribute('src');
        video.load();
      }
    }

    return () => {
      isSubscribed = false;
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [isCurrent, videoSrc, effectiveMuted]);

  // Handle visibility changes (browser tab minimized/restored)
  useEffect(() => {
    const handleVisibility = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) {
        video.pause();
      } else if (isCurrent && video.src) {
        video.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isCurrent]);

  // Synchronous audio unmuting directly inside physical user gesture tick (bypasses WebKit iOS Safari autoplay block)
  const handleToggleAudio = (e) => {
    e.stopPropagation();
    unlockAudioContext();
    
    const video = videoRef.current;
    if (video) {
      const willBeMuted = !effectiveMuted;
      video.muted = willBeMuted;
      if (!willBeMuted) {
        video.play().catch(() => {
          video.muted = true;
        });
      }
    }

    if (onToggleSound) {
      onToggleSound();
    } else {
      setLocalMuted(!localMuted);
    }
  };

  return (
    <div
      onClick={onDoubleTap}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#09090b',
        userSelect: 'none'
      }}
    >
      {/* Layer 1: LQIP (micro WebP preview with blur) */}
      {!isVideoLoaded && lqip && (
        <img
          src={lqip}
          alt=""
          loading="eager"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(16px)',
            transform: 'scale(1.08)',
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Layer 2: Crisp HD WebP Poster */}
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

      {/* Layer 3: Vertical video stream H.264 FastStart */}
      <video
        ref={videoRef}
        loop
        muted={effectiveMuted}
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
          transition: 'opacity 0.4s ease'
        }}
      />

      {/* Cinematic dark gradients for legibility of dish typography */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(9,9,11,0.92) 0%, rgba(9,9,11,0.3) 45%, transparent 100%)',
          pointerEvents: 'none'
        }}
      />

      {/* Sound toggle button */}
      {enableSoundToggle && videoSrc && (
        <button
          type="button"
          onClick={handleToggleAudio}
          style={{
            position: 'absolute',
            top: 'calc(16px + env(safe-area-inset-top))',
            left: '16px',
            zIndex: 30,
            background: 'rgba(15, 15, 20, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--glass-border)',
            borderRadius: '50%',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: effectiveMuted ? 'var(--text-muted)' : 'var(--accent-gold)',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
          }}
          title={effectiveMuted ? 'Включить ASMR звук' : 'Выключить звук'}
        >
          {effectiveMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      )}
    </div>
  );
};
