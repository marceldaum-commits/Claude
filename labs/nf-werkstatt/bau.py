#!/usr/bin/env python3
# Baut die Crackmes der Werkstatt aus dem Salz (zur Laufzeit). Jede Lösung ist pro Konto anders.
# Die Codes (Flags) liegen XOR-verschlüsselt in den Binärdateien – 'strings' verrät sie nicht.
import sys, hashlib, subprocess, os, random
salz = sys.argv[1]
r = random.Random(hashlib.sha256((salz+':werkstatt').encode()).hexdigest())
def code(n): return 'KLY{'+hashlib.sha256(f'{salz}:werkstatt:l{n}'.encode()).hexdigest()[:16]+'}'
# Der Flag-Code liegt NICHT mehr mit festem Schlüssel (0x5a) in der Binärdatei – sonst könnte man ihn per
# objdump+XOR lesen, OHNE das Crackme zu lösen. Stattdessen ist er mit der jeweiligen LÖSUNG (Passwort bzw.
# Seriennummer) XOR-verschlüsselt; gib() entschlüsselt mit genau dieser Eingabe. Ohne die richtige Lösung
# bleiben die .data-Bytes unbrauchbar. 'strings' verrät weiterhin nichts.
def gibcode(flag, keystr):
    kb = keystr.encode(); fb = flag.encode()
    enc = ','.join(str(fb[i] ^ kb[i % len(kb)]) for i in range(len(fb)))
    return ('\nstatic unsigned char F[] = {' + enc + '};\n'
            f'static int FN = {len(fb)};\n'
            'static void gib(const char*k){ char b[80]; int kl=(int)strlen(k); if(kl<1)return; '
            'int i; for(i=0;i<FN;i++) b[i]=F[i]^k[i%kl]; b[FN]=0; printf("RICHTIG! Code: %s\\n", b); }\n')
os.makedirs('/opt/werkstatt', exist_ok=True)
loesungen = {}

# cm1 – strings: Passwort im Klartext in der Binärdatei
pw1 = 'werkstatt-'+hashlib.sha256((salz+':w1').encode()).hexdigest()[:8]
c1 = '#include <stdio.h>\n#include <string.h>\n'+ gibcode(code(1), pw1) + f'''
int main(int argc,char**argv){{
  if(argc<2){{printf("Aufruf: %s <passwort>\\n",argv[0]);return 1;}}
  if(strcmp(argv[1],"{pw1}")==0){{gib(argv[1]);return 0;}}
  printf("Falsch.\\n");return 1;
}}'''
loesungen['cm1']=pw1

# cm2 – ltrace: Passwort wird zur Laufzeit zusammengebaut, dann strcmp
a,b,cc = (hashlib.sha256((salz+':w2'+x).encode()).hexdigest()[:4] for x in 'abc')
pw2=a+b+cc
c2 = '#include <stdio.h>\n#include <string.h>\n'+gibcode(code(2), pw2)+f'''
int main(int argc,char**argv){{
  char e[64]; e[0]=0; strcat(e,"{a}"); strcat(e,"{b}"); strcat(e,"{cc}");
  if(argc<2){{printf("Aufruf: %s <passwort>\\n",argv[0]);return 1;}}
  if(strcmp(argv[1],e)==0){{gib(argv[1]);return 0;}}
  printf("Falsch.\\n");return 1;
}}'''
loesungen['cm2']=pw2

# cm3 – Keygen (Summe): Seriennummer = Summe der Zeichen des Namens * 7 + 1234
user3='kunde'+str(r.randrange(10,99))
serial3=sum(user3.encode())*7+1234
c3 = '#include <stdio.h>\n#include <string.h>\n#include <stdlib.h>\n'+gibcode(code(3), str(serial3))+f'''
static long pruef(const char*u){{ long s=0; for(int i=0;u[i];i++) s+=(unsigned char)u[i]; return s*7+1234; }}
int main(int argc,char**argv){{
  if(argc<3){{printf("Aufruf: %s <name> <seriennummer>\\nHinweis: der Name steht fest: {user3}\\n",argv[0]);return 1;}}
  if(strcmp(argv[1],"{user3}")==0 && atol(argv[2])==pruef(argv[1])){{gib(argv[2]);return 0;}}
  printf("Falsch.\\n");return 1;
}}'''
loesungen['cm3']=(user3,str(serial3))

# cm4 – XOR-Passwort: erwartetes Passwort liegt XOR-verschlüsselt vor, Vergleich Zeichen für Zeichen (kein strcmp)
pw4='rev-'+hashlib.sha256((salz+':w4').encode()).hexdigest()[:8]
key4=r.randrange(1,255)
enc4='{'+','.join(str(ch^key4) for ch in pw4.encode())+'}'
c4 = '#include <stdio.h>\n#include <string.h>\n'+gibcode(code(4), pw4)+f'''
static unsigned char E[]={enc4}; static int N={len(pw4)}; static unsigned char K={key4};
int main(int argc,char**argv){{
  if(argc<2){{printf("Aufruf: %s <passwort>\\n",argv[0]);return 1;}}
  int ok=1; for(int i=0;i<N;i++){{ if((argv[1][i]==0) || ((unsigned char)argv[1][i] != (E[i]^K))) ok=0; }}
  if(ok && argv[1][N]==0){{gib(argv[1]);return 0;}}
  printf("Falsch.\\n");return 1;
}}'''
loesungen['cm4']=pw4

# cm5 – Keygen (pro Zeichen): Seriennummer = Hex von (Zeichen des Namens XOR Schlüssel)
user5='nutzer'+str(r.randrange(10,99)); key5=r.randrange(1,255)
serial5=''.join(f'{ch^key5:02x}' for ch in user5.encode())
c5 = '#include <stdio.h>\n#include <string.h>\n#include <stdlib.h>\n'+gibcode(code(5), serial5)+f'''
static unsigned char K={key5};
int main(int argc,char**argv){{
  if(argc<3){{printf("Aufruf: %s <name> <seriennummer>\\nHinweis: der Name steht fest: {user5}\\n",argv[0]);return 1;}}
  char s[128]; s[0]=0; char t[4];
  for(int i=0;argv[1][i];i++){{ sprintf(t,"%02x",(unsigned char)argv[1][i]^K); strcat(s,t); }}
  if(strcmp(argv[1],"{user5}")==0 && strcmp(argv[2],s)==0){{gib(argv[2]);return 0;}}
  printf("Falsch.\\n");return 1;
}}'''
loesungen['cm5']=(user5,serial5)

for name,src in [('cm1',c1),('cm2',c2),('cm3',c3),('cm4',c4),('cm5',c5)]:
    open(f'/opt/build/{name}.c','w').write(src)
    subprocess.run(['gcc','-O0','-o',f'/opt/werkstatt/{name}',f'/opt/build/{name}.c'],check=True)
    os.chmod(f'/opt/werkstatt/{name}',0o755)
# Lösungen NICHT ablegen – nur zur Kontrolle in der Testumgebung über Umgebungsvariable
if os.environ.get('WERKSTATT_LOESUNG'):
    import json; open('/tmp/loesung.json','w').write(json.dumps({k:(v if isinstance(v,str) else list(v)) for k,v in loesungen.items()}))
print("Werkstatt gebaut:", ', '.join(loesungen))
