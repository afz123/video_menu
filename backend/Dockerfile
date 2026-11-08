# ==========================================
# ЭТАП 1: Компиляция Python -> C -> .so бинарники
# ==========================================
FROM python:3.11-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Компилируем весь Python код в бинарные .so библиотеки
RUN python setup_cython.py build_ext --inplace

# Удаляем все исходные .py и сгенерированные .c файлы
RUN find app -name "*.py" ! -name "__init__.py" -delete && \
    find app -name "*.c" -delete && \
    rm -rf build setup_cython.py

# ==========================================
# ЭТАП 2: Чистый продакшн-образ БЕЗ исходного кода
# ==========================================
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем установленные зависимости
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Копируем только скомпилированные .so файлы
COPY --from=builder /app/app /app/app
COPY --from=builder /app/storage /app/storage

RUN mkdir -p storage/videos storage/tmp

EXPOSE 8088

# Uvicorn нативно загружает скомпилированный app.main (.so)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8088"]
