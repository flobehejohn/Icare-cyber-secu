# Roadmap Icare Cyber Sécu Lab

## v1 — Protocole naïf

- Icare compile.
- BEUI2 fonctionne en UDP.
- Messages observables en clair.

## v2 — Captures réseau

- tcpdump.
- Wireshark.
- Filtre udp.port == 9999.
- Preuves dans audit/.

## v3 — Injection contrôlée

- Injection locale de 2BEUI2bob.
- Démonstration de pollution de table.
- Rapport de faille.

## v4 — Détection des failles

- Validation des tailles.
- Logs des messages invalides.
- Détection des pseudos suspects.
- Tests négatifs.

## v5 — Durcissement

- HMAC.
- Nonce/timestamp.
- Anti-rejeu.
- Rate limiting.

## v6 — Rapport sécurité

- Spécification protocolaire.
- Captures.
- Vulnérabilités.
- Correctifs.
- Preuves de tests.
