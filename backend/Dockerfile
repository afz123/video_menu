# ==========================================
# БЫСТРЫЙ ПРОДАКШН-ОБРАЗ (БЕЗ CYTHON, СБОРКА ЗА 10-15 СЕК)
# ==========================================
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Создаем симлинк на ffmpeg из imageio_ffmpeg
RUN FFMPEG_BIN=$(find /usr/local/lib/python3.11/site-packages/imageio_ffmpeg/binaries -name "ffmpeg*" -type f -perm /111 2>/dev/null | head -n 1) && \
    if [ -n "$FFMPEG_BIN" ]; then ln -s "$FFMPEG_BIN" /usr/local/bin/ffmpeg; fi

COPY . .

# Быстрая байткод-оптимизация (pyc)
RUN python -m compileall -b app && \
    mkdir -p storage/videos storage/tmp

EXPOSE 8088

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8088"]
