# Nachtfalter Profi-Arena „Der Tresor“ – für Experten (nur für die Arena / eigenen PC)
# Bauen:  docker build -t nf-tresor .
# Start:  docker run -d --rm --network none -e KLY_TOKEN=KLY-XXXXXX nf-tresor
FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssh-server openssh-client python3 procps iproute2 netcat-openbsd \
      curl git openssl less nano file ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /run/sshd
COPY nachtfalter-hilfe /usr/local/share/nachtfalter
RUN install -m 755 /usr/local/share/nachtfalter/begriff /usr/local/share/nachtfalter/hilfe /usr/local/bin/ \
 && chmod 644 /usr/local/share/nachtfalter/*.txt
COPY setup.sh /opt/tresor/setup.sh
RUN chmod 700 /opt/tresor/setup.sh
ENTRYPOINT ["/opt/tresor/setup.sh"]
