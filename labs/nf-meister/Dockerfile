# Nachtfalter Arena „Der Meister: Das Rechenzentrum“ – Meister-Stufe (Pivoting + Buffer Overflow).
# Ein abgeschotteter Container simuliert ein internes Netz über mehrere Konten. Kein Internet.
FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssh-server openssh-client python3 procps iproute2 netcat-openbsd \
      curl less nano file ca-certificates gcc libc6-dev binutils gdb xxd \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /run/sshd
COPY nachtfalter-hilfe /usr/local/share/nachtfalter
RUN install -m 755 /usr/local/share/nachtfalter/begriff /usr/local/share/nachtfalter/hilfe /usr/local/bin/ \
 && chmod 644 /usr/local/share/nachtfalter/*.txt
COPY pruefdienst.c /opt/build/pruefdienst.c
RUN gcc -fno-stack-protector -no-pie -O0 -o /opt/build/pruefdienst /opt/build/pruefdienst.c
COPY setup.sh /opt/meister/setup.sh
RUN chmod 700 /opt/meister/setup.sh
ENTRYPOINT ["/opt/meister/setup.sh"]
