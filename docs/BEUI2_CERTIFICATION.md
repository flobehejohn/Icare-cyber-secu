# Certification locale BEUI2

## Objectif

Valider la chaîne réseau complète :

```text
Icare -> commande beui2 -> socket UDP 9999 -> paquet BEUI2 -> capture tcpdump -> injection locale contrôlée -> réception par Icare -> preuve audit
```

## Commande

```bash
bash scripts/quality/certify-beui2-local.sh
```

## Pré-requis

```bash
sudo apt install -y tcpdump netcat-openbsd
```

## Périmètre

Test limité à 127.0.0.1, en local, VM ou réseau explicitement autorisé.

## Preuves générées

```text
audit/_latest/beui2-<timestamp>/
```

Fichiers : icare.log, inject.log, tcpdump.log, summary.txt, summary.json.

## Lecture cybersécurité

Ce test démontre volontairement qu’un paquet UDP forgé localement peut annoncer un pseudo arbitraire.

Durcissement futur : validation stricte, HMAC, anti-rejeu, journalisation structurée.
