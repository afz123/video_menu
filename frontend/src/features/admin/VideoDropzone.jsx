import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { menuService } from '../../services/menuService';

export const VideoDropzone = ({ onMediaReady, currentMediaId }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [mediaId, setMediaId] = useState(currentMediaId || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = async (file) => {
    if (!file) return;

    // Check video type
    const validExtensions = ['mp4', 'mov', 'webm', 'mkv', 'avi'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(ext)) {
      alert(`Формат .${ext} не поддерживается. Допустимы: ${validExtensions.join(', ')}`);
      return;
    }

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    // Auto upload to backend
    setIsUploading(true);
    setStatusMessage('Загрузка видео на сервер...');

    try {
      const res = await menuService.uploadVideo(file);
      setMediaId(res.media_id);
      setIsUploading(false);
      setIsProcessing(true);
      setStatusMessage('FFmpeg обрабатывает видео (генерация LQIP и 720p H.264)...');

      if (onMediaReady) onMediaReady(res.media_id);

      // Poll status for 15 seconds
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await menuService.getMediaStatus(res.media_id);
          if (statusRes.status === 'READY') {
            setIsProcessing(false);
            setStatusMessage('Видео успешно оптимизировано и готово!');
            clearInterval(pollInterval);
          } else if (statusRes.status === 'FAILED') {
            setIsProcessing(false);
            setStatusMessage('Ошибка сжатия видео: ' + (statusRes.error_message || 'Неизвестно'));
            clearInterval(pollInterval);
          }
        } catch (_) {}

        if (attempts > 20) {
          clearInterval(pollInterval);
          setIsProcessing(false);
          setStatusMessage('Обработка продолжается в фоне.');
        }
      }, 1500);

    } catch (err) {
      setIsUploading(false);
      setIsProcessing(false);
      setStatusMessage('Ошибка загрузки: ' + err.message);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => {
    setDragActive(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files[0]);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/avi"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files[0]);
          }
        }}
      />

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: dragActive
            ? '2px dashed var(--accent-gold)'
            : '2px dashed rgba(212, 175, 55, 0.35)',
          backgroundColor: dragActive
            ? 'rgba(212, 175, 55, 0.08)'
            : 'rgba(15, 15, 20, 0.6)',
          borderRadius: '20px',
          padding: '24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          minHeight: '180px'
        }}
      >
        {previewUrl ? (
          <div style={{ position: 'relative', width: '120px', height: '160px', borderRadius: '12px', overflow: 'hidden' }}>
            <video
              src={previewUrl}
              autoPlay
              loop
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ) : (
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: 'rgba(212, 175, 55, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-gold)'
            }}
          >
            <UploadCloud size={28} />
          </div>
        )}

        <div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
            {selectedFile ? selectedFile.name : 'Нажмите или перетащите видео блюда'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            MP4, MOV (iPhone ProRes/HEVC), WebM, MKV • Вертикальный формат (9:16)
          </div>
        </div>

        {/* Status indicators */}
        {isUploading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', fontSize: '13px' }}>
            <Loader2 size={16} className="animate-spin" />
            <span>{statusMessage}</span>
          </div>
        )}

        {isProcessing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontSize: '13px' }}>
            <Loader2 size={16} className="animate-spin" />
            <span>{statusMessage}</span>
          </div>
        )}

        {!isUploading && !isProcessing && mediaId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '13px' }}>
            <CheckCircle2 size={16} />
            <span>{statusMessage || 'Видео привязано (ID: ' + mediaId + ')'}</span>
          </div>
        )}
      </div>
    </div>
  );
};
