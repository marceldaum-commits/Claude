// Absichtlich verwundbarer Prüfdienst (Lehrzweck, Buffer Overflow / ret2win).
// Baut: gcc -fno-stack-protector -no-pie -O0 -o pruefdienst pruefdienst.c
// Läuft als Dienst-Benutzer und liest den Abschluss-Code aus einer Datei, die nur er lesen darf.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

void gewinn() {
    // Wird normal NIE aufgerufen – nur per Overflow der Rücksprungadresse erreichbar.
    char code[64];
    FILE *f = fopen("/opt/meister/pruef.code", "r");
    if (f) { if (fgets(code, sizeof(code), f)) printf("ZUGRIFF GEWAEHRT. %s", code); fclose(f); }
    else printf("ZUGRIFF GEWAEHRT, aber Code-Datei fehlt.\n");
    fflush(stdout);
}

void bearbeite() {
    char puffer[64];
    printf("Prüfdienst Rechenzentrum. Sende deine Kennung:\n");
    fflush(stdout);
    read(0, puffer, 256);           // LÜCKE: liest bis 256 Bytes in 64-Byte-Puffer
    printf("Kennung '%s' unbekannt. Zugriff verweigert.\n", puffer);
    fflush(stdout);
}

int main() {
    setvbuf(stdout, NULL, _IONBF, 0);
    bearbeite();
    return 0;
}
