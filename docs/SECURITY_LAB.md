# Cadre de sécurité

Ce dépôt est un laboratoire pédagogique défensif.

## Autorisé

- Tests sur 127.0.0.1.
- Tests en VM locale.
- Tests sur LAN explicitement autorisé.
- Capture de tes propres paquets.
- Injection contrôlée pour démontrer les failles du protocole BEUI2.

## Non autorisé

- Injection sur réseau tiers.
- Usurpation hors laboratoire.
- Déni de service.
- Persistance, furtivité, rootkit ou contournement système réel.

## Objectif pédagogique

Comprendre la chaîne complète :

    code C
    -> processus Linux
    -> socket UDP
    -> paquet IP
    -> capture réseau
    -> faille protocolaire
    -> durcissement
