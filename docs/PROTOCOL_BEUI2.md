# Protocole BEUI2

## Transport

- UDP
- Port 9999
- Encodage ASCII
- Usage : laboratoire local ou LAN explicitement autorisé

## Format

    <type:1 octet><magic:5 octets><payload:n octets>

## Magic

    BEUI2

## Types

| Type | Sens |
|---|---|
| 1 | annonce de présence |
| 2 | accusé de réception / présence |
| 3 | message général |

## Exemples

    1BEUI2alice
    2BEUI2bob
    3BEUI2message.txt

## Failles volontaires de la version naïve

- Pas d'authentification.
- Pas de chiffrement.
- Pas d'anti-rejeu.
- Usurpation de pseudo possible.
- Injection UDP possible.
- Pollution possible de la table des présents.

## Durcissement cible

- Validation stricte des tailles.
- Validation stricte des caractères.
- HMAC applicatif.
- Nonce/timestamp.
- Anti-rejeu.
- Journalisation structurée.
