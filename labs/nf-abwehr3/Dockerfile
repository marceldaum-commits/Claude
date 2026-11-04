# Nachtfalter Profi-Arena „Angriff! Stufe 3“ – einen Hacker abwehren (Extrem) (nur für die Arena / eigenen PC)
# Bauen:  docker build -t nf-abwehr3 .
# Start:  docker run -d --rm --network none -e KLY_TOKEN=KLY-XXXXXX nf-abwehr3
FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssh-server openssh-client python3 procps iproute2 netcat-openbsd gawk git \
      curl xxd gzip less nano file ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /run/sshd
COPY setup.sh /opt/lab/setup.sh
RUN chmod 700 /opt/lab/setup.sh
ENTRYPOINT ["/opt/lab/setup.sh"]
