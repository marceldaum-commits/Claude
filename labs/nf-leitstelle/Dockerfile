# Nachtfalter Profi-Arena „Die Leitstelle“ – Netzwerk & Dienste (nur für die Arena / eigenen PC)
# Bauen:  docker build -t nf-leitstelle .
# Start:  docker run -d --rm --network none -e KLY_TOKEN=KLY-XXXXXX nf-leitstelle
FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssh-server openssh-client python3 procps iproute2 netcat-openbsd \
      curl xxd gzip less nano file ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /run/sshd
COPY setup.sh /opt/leitstelle/setup.sh
RUN chmod 700 /opt/leitstelle/setup.sh
ENTRYPOINT ["/opt/leitstelle/setup.sh"]
