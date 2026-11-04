# KLY-Keller – Linux-Wargame für Kali Level Up (PC-Variante, Story „Der Kellerserver“)
# Bauen:  docker build -t kly-keller .
# Start:  docker run -d --rm --name kly-keller -e KLY_TOKEN=KLY-XXXXXX -p 127.0.0.1:2220:22 kly-keller
# Spielen: ssh azubi@127.0.0.1 -p 2220   (Passwort: azubi)
# Port IMMER mit 127.0.0.1: veröffentlichen – sonst wäre der Server im Netz erreichbar.
FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssh-server openssh-client git python3 procps file tar gzip \
      curl nano less bsdextrautils ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /run/sshd
COPY nachtfalter-hilfe /usr/local/share/nachtfalter
RUN install -m 755 /usr/local/share/nachtfalter/begriff /usr/local/share/nachtfalter/hilfe /usr/local/bin/ \
 && chmod 644 /usr/local/share/nachtfalter/*.txt
COPY setup.sh /opt/keller/setup.sh
RUN chmod 700 /opt/keller/setup.sh
EXPOSE 22
ENTRYPOINT ["/opt/keller/setup.sh"]
