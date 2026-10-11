import { useEffect } from 'react';

export const useVideoPreload = (urls = []) => {
  useEffect(() => {
    if (!urls || urls.length === 0) return;

    urls.forEach((url) => {
      if (!url) return;
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'video';
      link.href = url;
      document.head.appendChild(link);

      return () => {
        try {
          document.head.removeChild(link);
        } catch (_) {}
      };
    });
  }, [urls]);
};
