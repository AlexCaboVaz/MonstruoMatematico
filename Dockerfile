# =====================================================================
# Dockerfile — Monstruo Matemático
# Empaqueta backend (FastAPI) + frontend (estático) en un único
# servicio, listo para desplegar en Render, Railway, Fly.io, etc.
# =====================================================================
FROM python:3.11-slim

WORKDIR /app

# Dependencias de Python
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Código del backend y el frontend (el backend lo sirve como
# estático, ver app/main.py -> StaticFiles).
COPY backend ./backend
COPY frontend ./frontend

WORKDIR /app/backend

# La mayoría de plataformas de hosting inyectan el puerto en $PORT;
# 8000 es el valor por defecto para probar en local con Docker.
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
