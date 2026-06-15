# Icare Cyber Sécu Lab

Laboratoire pédagogique C/Linux autour de l'interpréteur Icare et du protocole UDP BEUI2.

## Objectif

Créer un laboratoire cybersécurité complet :

1. Protocole naïf volontairement observable.
2. Captures réseau avec tcpdump / Wireshark.
3. Injection contrôlée de faux paquets en local.
4. Détection des failles.
5. Durcissement progressif.
6. Rapport de sécurité reproductible.

## Architecture

- Icare : interface interactive.
- BEUI2 : protocole applicatif pédagogique.
- UDP : transport réseau.
- Port : 9999.
- tcpdump / Wireshark : instruments d'observation.
- audit/_latest : preuves de validation locale.

## Build

    make clean
    make

## Tests

    make test

## Audit local

    make audit

## Lancement interactif

    ./icare -n florian -t

Commandes utiles dans Icare :

    pwd
    vers
    cd /tmp
    echo hello
    beui2
    beui2 help
    beui2 on
    beui2 liste
    beui2 off
    exit

## Sécurité

Ce dépôt est un laboratoire pédagogique. Les scripts d'injection doivent être utilisés uniquement sur 127.0.0.1, en VM, ou sur un réseau explicitement autorisé.

## Certification locale BEUI2

    sudo apt install -y tcpdump netcat-openbsd
    bash scripts/quality/certify-beui2-local.sh

Cette commande valide la chaîne : Icare -> beui2 -> UDP 9999 -> tcpdump -> injection locale -> preuve audit.

Les preuves sont générées dans audit/_latest/beui2-<timestamp>/.
\n

---

## Doctrine Runtime Evidence Provider

Icare Sentinel Lab can export a public Doctrine-compatible DREPS evidence pack.

```bash
bash scripts/export-dreps.sh
bash scripts/validate-lab.sh
```

This public lab produces runtime/network evidence. Doctrine Platform remains responsible for ingestion, scoring, audit pack export, seal, keyless signing and WORM governance.
