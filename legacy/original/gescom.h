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
/* gescom.h : librairie des fonctions pour la gestion des commandes
 */
#define VERSION_GESCOM 1.0

extern int run;
extern char ** Mots; /* le tableau des mots de la commande */
extern int NMots;    /* le nombre de mots */
extern char *PSEU;   /* le pseudo de l'utilisateur */

void majComInt(void); /* mise a jour des commandes internes */
void listeComInt(void);
int execComInt(int N, char **P);
int execComExt(char **P);
char * getPrompt(void);
int analyseCom(char *b);

