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
# Startskript NICHT unter /opt/werkstatt ablegen: dort hängt zur Laufzeit ein tmpfs,
# das die eingebackene Datei überdecken würde (Container könnte nicht starten).
COPY setup.sh /usr/local/bin/werkstatt-setup.sh
RUN chmod 755 /usr/local/bin/werkstatt-setup.sh
ENTRYPOINT ["/usr/local/bin/werkstatt-setup.sh"]
