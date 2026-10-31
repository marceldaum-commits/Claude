# KLY-Target – Trainingsziel für Kali Level Up (synthetisch, absichtlich verwundbar)
# Bauen:  docker build -t kly-target .
# Start:  docker run -d --rm --name kly-r1 -e KLY_TOKEN=KLY-XXXXXX -p 127.0.0.1:10080:10080 kly-target r1
# Ports IMMER mit 127.0.0.1: veröffentlichen – sonst wäre das Ziel im Netz erreichbar.
FROM python:3.12-alpine
WORKDIR /lab
COPY server.py /lab/server.py
ENV KLY_BIND=0.0.0.0 KLY_DOCKER=1 PYTHONUNBUFFERED=1
USER nobody
ENTRYPOINT ["python3", "/lab/server.py"]
