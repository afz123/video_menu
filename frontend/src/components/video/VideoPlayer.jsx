import React, { useState, useRef, useEffect, useCallback } from 'react';
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

  // Очистка аппаратного декодера WebKit при уходе со слайда
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

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (isSubscribed) setIsVideoLoaded(true);
          })
          .catch((err) => {
            if (isSubscribed) {
              if (err.name === 'NotAllowedError') {
                video.muted = true;
                if (!effectiveMuted && onToggleSound) {
                  onToggleSound();
                }
              }
              if (err.name !== 'AbortError') {
                video.muted = true;
                video.play().then(() => {
                  if (isSubscribed) setIsVideoLoaded(true);
                }).catch(() => {});
              }
            }
          });
      }
    } else {
      video.pause();
      video.removeAttribute('src'); // Принудительный сброс видеобуфера
      video.load();                 // Освобождение GPU-декодера в Safari
      setIsVideoLoaded(false);
    }

    return () => {
      isSubscribed = false;
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [isCurrent, videoSrc, effectiveMuted, onToggleSound]);

  // Handle visibility changes (browser tab minimized/restored)
  useEffect(() => {
    const handleVisibility = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) {
        video.pause();
      } else if (isCurrent && video.src) {
        video.play().catch((err) => {
          if (err.name === 'NotAllowedError') {
            video.muted = true;
            video.play().catch(() => {});
          }
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isCurrent]);

  // Synchronous audio unmuting directly inside physical user gesture tick
  const handleToggleAudio = useCallback((e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const targetMuted = !video.muted;
    video.muted = targetMuted; // Синхронно в контексте физического тапа пользователя
    if (!targetMuted) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          video.muted = true; // Безопасный откат при блокировке автоплея
        });
      }
    }

    if (onToggleSound) {
      onToggleSound();
    } else {
      setLocalMuted((prev) => !prev);
    }
  }, [onToggleSound]);

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

      {/* Layer 3: Vertical video stream H.264 FastStart - Рендерим ТОЛЬКО если слайд активен */}
      {isCurrent && videoSrc && (
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
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

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
            background: 'rgba(15, 15, 20, 0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
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
