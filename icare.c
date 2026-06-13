/* Copyright (C) 2015-2026  Patrick Foubet - E2L (Ecole du Logiciel Libre)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or any
later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>
*******************************************************************/
/* icare.c : Interpreteur de Commandes Avancees pour le Reseau de l'E2L 
 */
#define VERSION 1.13

#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <signal.h>
#include <readline/readline.h>
#include <readline/history.h>

#include "gescom.h"

int TRACE=0;
int run=1;
char *PSEU=NULL;

int main(int N, char *P[])
{
char *prompt, *line=NULL, *cursor=NULL, *com;
int i, nm, opt;
    signal(SIGINT,SIG_IGN);
    prompt=getPrompt();
    /* lecture des parametres */
    while ((opt = getopt(N, P, "n:t")) != -1) {
        switch (opt) {
        case 't':
            TRACE = 1;
            break;
        case 'n':
            PSEU = optarg;
            break;
        default: /* '?' */
            fprintf(stderr, "Usage: %s [-n pseudo] [-t] name\n",
                    P[0]);
            exit(EXIT_FAILURE);
        }
    }
    // printf("TRACE=%d PSEU=%s; optind=%d\n", TRACE, PSEU, optind);
    if (optind < N) {
       fprintf(stderr,"Le parametre %s est invalide !\n",P[optind]); return 1;
    }
    /* verification que le nom a bien ete donne */
    if (PSEU == NULL) {
       fprintf(stderr,"Le nom utilisateur est obligatoire !\n"); return 1;
    }
   

    /* initialisation des commandes internes */
    majComInt();
    if (TRACE) listeComInt(); /* verification */
    read_history(NULL);
    printf("icare version %.2f\n",VERSION);
    while (run) {
      if (line != NULL) { free((void*)line); line=NULL; }
      if ((line = readline(prompt)) != NULL) {
         if (strlen(line) != 0) {
           add_history(line);
           /* traitement de la commande */
           if (TRACE) printf("Commande : %s\n",line);
           /* separation des commandes */
           cursor = line;
           while ((com=strsep(&cursor,";")) != NULL) {
             // if (com == NULL) { run=0; break; }
             if (strlen(com) == 0) continue;
             if ((nm = analyseCom(com)) > 0) { /* on execute la commande */
              if (TRACE) {
                 printf("La commande est %s !\n",Mots[0]);
                 if (NMots > 1) {
                   printf("Les parametres : \n");
                   for (i=1; i<NMots; i++) printf("\t%s\n",Mots[i]);
                 }
              }
              if (execComInt(NMots,Mots)) continue;
              execComExt(Mots);
             }
           }
         }
      } else break;
    }
    if (line != NULL) free((void*)line);
    write_history(NULL);
    printf("Au revoir !\nFin de %s v%.2f\n",P[0],VERSION);
    return 0;
}

