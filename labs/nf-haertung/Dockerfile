# Nachtfalter Profi-Arena „Die Härtung“ – Blue Team: einen Server absichern (nur für die Arena / eigenen PC)
# Bauen:  docker build -t nf-haertung .
# Start:  docker run -d --rm --network none -e KLY_TOKEN=KLY-XXXXXX nf-haertung
FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 procps iproute2 netcat-openbsd gawk \
      less nano file ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY nachtfalter-hilfe /usr/local/share/nachtfalter
RUN install -m 755 /usr/local/share/nachtfalter/hilfe /usr/local/bin/ \
 && chmod 644 /usr/local/share/nachtfalter/*.txt
COPY waechter.py /opt/lab/waechter.py
COPY setup.sh /opt/lab/setup.sh
RUN chmod 700 /opt/lab/setup.sh
ENTRYPOINT ["/opt/lab/setup.sh"]
