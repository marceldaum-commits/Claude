# Nachtfalter Arena „Der Mitschnitt“ – Netzwerk-Forensik: einen Mitschnitt (pcap) analysieren.
FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssh-server openssh-client python3 python3-scapy tshark \
      procps netcat-openbsd curl less nano file ca-certificates xxd \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /run/sshd
COPY nachtfalter-hilfe /usr/local/share/nachtfalter
RUN install -m 755 /usr/local/share/nachtfalter/begriff /usr/local/share/nachtfalter/hilfe /usr/local/bin/ \
 && chmod 644 /usr/local/share/nachtfalter/*.txt
COPY setup.sh /opt/lab/setup.sh
RUN chmod 700 /opt/lab/setup.sh
ENTRYPOINT ["/opt/lab/setup.sh"]
