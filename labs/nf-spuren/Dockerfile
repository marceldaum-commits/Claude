# Nachtfalter Profi-Arena „Die Spurensuche“ – Forensik für Einsteiger (nur für die Arena / eigenen PC)
# Bauen:  docker build -t nf-spuren .
# Start:  docker run -d --rm --network none -e KLY_TOKEN=KLY-XXXXXX nf-spuren
FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssh-server openssh-client python3 procps iproute2 netcat-openbsd gawk \
      curl xxd gzip less nano file ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /run/sshd
COPY setup.sh /opt/lab/setup.sh
RUN chmod 700 /opt/lab/setup.sh
ENTRYPOINT ["/opt/lab/setup.sh"]
