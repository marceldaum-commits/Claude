# Nachtfalter Arena „Die Werkstatt“ – Reverse Engineering (Crackmes ohne Quelltext knacken).
FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssh-server openssh-client python3 procps netcat-openbsd \
      curl less nano file ca-certificates gcc libc6-dev binutils gdb ltrace xxd \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /run/sshd
COPY nachtfalter-hilfe /usr/local/share/nachtfalter
RUN install -m 755 /usr/local/share/nachtfalter/begriff /usr/local/share/nachtfalter/hilfe /usr/local/bin/ \
 && chmod 644 /usr/local/share/nachtfalter/*.txt
COPY bau.py /opt/build/bau.py
COPY setup.sh /opt/werkstatt/setup.sh
RUN chmod 700 /opt/werkstatt/setup.sh
ENTRYPOINT ["/opt/werkstatt/setup.sh"]
