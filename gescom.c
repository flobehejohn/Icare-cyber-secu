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
/* gescom.c : librairie des fonctions pour la gestion des commandes
 */
#define _GNU_SOURCE     /* To get defns of NI_MAXSERV and NI_MAXHOST */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <ifaddrs.h>
#include <sys/socket.h>
#include <netdb.h>
#include <netinet/in.h>
#include <netinet/ip.h>
#include <arpa/inet.h>
#include <linux/if_link.h>
#include <pthread.h>
#include <semaphore.h>

#include "gescom.h"

#define PORT 9999 /* le port sur lequel le serveur attend les messages */
int RUN=1;
#define LBUF 512

sem_t SemTabs;

/* la tables des adresses IP locales */
#define MAXLOC 20
char * ADLOC[MAXLOC];
int iA=0;

int addLoc(char * A)
{
int i;
void *M;
  if (iA == MAXLOC) return -1; /* tableau plein !! */
  for (i=0; i<iA; i++) {
    if (ADLOC[i] != NULL) {
       if (strcmp(A,ADLOC[i]) == 0) return 0;
    }
  }
  /* on l'ajoute */
  if ((M = malloc(strlen(A)+1)) == NULL) {
     perror("malloc"); exit(1);
  }
  ADLOC[iA] = (char*)M;
  strcpy(ADLOC[iA],A);
  iA++;
  return 0;
}

int isLoc(char *A) /* est ce une adresse locale ? */
{
int i;
  for (i=0; i<iA; i++) {
     if (strcmp(A,ADLOC[i]) == 0) return 1;
  }
  return 0;
}

/* le tableau des adresses connues */
#define MAXT 100
#define LNOM 24
struct elt {
   char add[16];
   char nom[LNOM+1];
};
struct elt TAB[MAXT];
int iT=0;

int addElt(char *n, struct in_addr A)
{
int i;
  if (iT==MAXT) return -1; /* le tableau est plein */
  /* verification si il existe ou pas */
  for (i=0; i<iT; i++) {
      if (strcmp(TAB[i].add,inet_ntoa(A)) == 0) return 0;
  }
  sem_wait(&SemTabs); /* on verouille l'accès a la table */
  strncpy(TAB[iT].nom,n,LNOM);
  TAB[iT].nom[LNOM]='\0';
  strcpy(TAB[iT].add,inet_ntoa(A));
  iT++;
  sem_post(&SemTabs);
  return 0;
}

#define CODPROTO "BEUI2"
/* structure du message d'identification
octet 1 : code 1 message broadcast ou 2 accuse de reception
octets 2-6: BEUI2 un identifiant pour etre certain que c'est pas une erreur !
octets 7 et suivant : le nom de l'expediteur
 */

/* extensions des codes :
 3 : pour envoyer un message    3BEUI2Le nom du fichier contenant le message
****************************/

/* la fonction qui sera le point de depart du thread du serveur netbeui2 */
static int EtatBeui2=0; /* etat on ou off du serveur */
pthread_t ThBeui2;  /* l'identifiant du thread serveur */
void * MainBeui2(void * P)
{
   (void)P;
int sid,n,s;
unsigned int lg;
struct ifaddrs *ifaddr, *ifa;
char buf[LBUF+1];
char abroad[NI_MAXHOST];
char host[NI_MAXHOST];
char admess[NI_MAXHOST]; /* adresse IP du message */

struct sockaddr_in S; /* structure pour initialise l'entete du message */
struct sockaddr_in SR; /* structure pour les info de reception */

   /* initialisation du semaphore pour acceder aux tables */
   if (sem_init(&SemTabs, 0, 1) == -1) {
     perror("SemTabs"); return NULL;
   }
   /* creation du socket */
   if ((sid = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP)) == -1) {
     perror("socket");
     return NULL;
   }
   /* initialisation du port */
   bzero((void*)&S, (size_t)sizeof(S));
   S.sin_family = AF_INET;
   S.sin_port = htons(PORT);
   /* on fait l'attachement au port demandé */
   if (bind(sid, (struct sockaddr *) &S, sizeof(S)) == -1) {
     perror("bind");
     return NULL;
   }
   /* on autorise le socket a faire du broadcast */
   lg=1;
   setsockopt(sid, SOL_SOCKET, SO_BROADCAST,(void*)&lg,sizeof(lg));
   /* on envoie un message en broadcast sur toutes les interfaces */
   /* initialisation du buffer */
   sprintf(buf,"1%s%s",CODPROTO,PSEU);
   if (getifaddrs(&ifaddr) == -1) {
        perror("getifaddrs"); exit(EXIT_FAILURE);
   }
   for (ifa = ifaddr, n = 0; ifa != NULL; ifa = ifa->ifa_next, n++) {
      if (ifa->ifa_addr == NULL) continue;
      /* on ignore tout ce qui n'est pas IPv4 et l'interface lo */
      if (ifa->ifa_addr->sa_family != AF_INET) continue;
      /* on ajoute a la table des adresses locales */
      s = getnameinfo(ifa->ifa_addr, sizeof(struct sockaddr_in),
                    host, NI_MAXHOST, NULL, 0, NI_NUMERICHOST);
      if (s != 0) {
        printf("getnameinfo() failed: %s\n", gai_strerror(s)); exit(1);
      }
      addLoc(host);
      if (strcmp(ifa->ifa_name,"lo") == 0) continue;
      s = getnameinfo(ifa->ifa_broadaddr, sizeof(struct sockaddr_in),
                    abroad, NI_MAXHOST, NULL, 0, NI_NUMERICHOST);
      if (s != 0) {
        printf("getnameinfo() failed: %s\n", gai_strerror(s)); exit(1);
      }
      inet_aton(abroad,&(S.sin_addr));
      if (sendto(sid,buf,strlen(buf),MSG_CONFIRM,(struct sockaddr*)&S,sizeof(S))
        == -1) {
            perror("sendto"); return NULL;
      }
   }
   EtatBeui2=1; /* le serveur est lance !!  */
   /* on rentre dans la boucle qui recoit les messages */
   while (RUN==1) {
     lg = sizeof(SR);
     if ((n = recvfrom(sid,buf,LBUF,0,(struct sockaddr*)&SR,&lg)) == -1)
       perror("recvfrom");
     else { /* on affiche le message */
       buf[n] = '\0';
       strcpy(admess,inet_ntoa(SR.sin_addr));
       if (isLoc(admess)&& (*buf == '1')) continue;
       printf("Message Recu  de %s : %s\n", admess,buf);
     }
     /* on verifie que le message est valide */
     if (strncmp(buf+1,CODPROTO,5) != 0) continue;
     /* on enregistre le nom dans la liste avec son adresse IP */
     if ((*buf == '1') || (*buf == '2')) {
       printf("Ajout de %s : %s\n", inet_ntoa(SR.sin_addr),buf);
       if (addElt(buf+6,SR.sin_addr)==-1) fprintf(stderr,"Tableau plein !!\n");
       /* on envoie l'accuse de reception */
       if (buf[0] == '2') continue; /* c'est un AR !! */
       /* fabrication de l'AR */
       sprintf(buf,"2%s%s",CODPROTO,PSEU);
       if (sendto(sid,buf,strlen(buf),0,(struct sockaddr*)&SR,sizeof(SR))==-1)
           perror("sendto");
       continue;
     } else {
       printf("Message Recu  de %s : %s\n", admess,buf);
     }
   }
   close(sid);
   return NULL;
}

/* Gestion des commandes internes */
struct ComInt {
    char * nom;
    void (*com) (int, char **);
};
#define NBMAXC 10 /* Nb maxi de commandes internes */
static struct ComInt TCom[NBMAXC];
static int iTCom=0; /* indice du tableau */

static void ajouteCom(char * n, void (*com) (int N, char *P[]) )
{
  if (iTCom == NBMAXC) {
     fprintf(stderr,"Erreur : Table des commandes internes trop petite !!\n");
     exit(1);
  }
  TCom[iTCom].nom = n;
  TCom[iTCom].com = com;
  iTCom++;
}

static void Sortie(int N, char *P[]) { (void)N; (void)P; run = 0; }
static void Pwd(int N, char *P[]) {
char *pw;
   (void)N;
   (void)P;
   pw=getcwd(NULL,0);
   printf("%s\n",pw);
   free((void*)pw);
}
static void Chdir(int N, char *P[])
{
char *dir;
   if (N == 1) dir = getenv("HOME");
   else dir = P[1];
   if (chdir(dir) == -1) perror(dir);
}
static void Version(int N, char *P[])
{
   (void)N;
   (void)P;
   printf("gescom version %.2f\n",VERSION_GESCOM);
}
static void AideBeui2(char * n)
{
   printf("Utilisation : %s [action] :\n",n);
   printf("\tpar defaut etat du serveur netbeui2\n");
   printf("\ton : lancement du serveur netbeui2\n");
   printf("\toff : arret du serveur netbeui2\n");
   printf("\thelp : affichage de cette aide.\n");
   printf("\tliste : affichage de la liste des presents.\n");
   printf("\tmgene : envoi d'un message a tout le monde.\n");
}
int sid2;
static void Beui2(int N, char *P[])
{
int i;
struct sockaddr_in S;
char buf[LBUF+1];
   if (N == 1) {
     if (EtatBeui2) printf("Serveur actif.\n");
     else  printf("Serveur inactif.\n");
     return;
   }
   if (N > 2) {
     if (N == 3) {
      if (strcmp("mgene",P[1]) == 0) { /* envoie le message a tout le monde */
        if (!EtatBeui2) {
           printf("Le serveur n'est pas actif !\n"); return;
        }
        /* le message est dans un fichier et c'est le nom du fichier qui
           est le second parametre. ATTENTION !! :
           On ne prends que les 32 premiers  Ko !! */
        /* initialisation du port */
        bzero((void*)&S, (size_t)sizeof(S));
        S.sin_family = AF_INET;
        S.sin_port = htons(PORT);
        sem_wait(&SemTabs);
        for (i=0; i< iT; i++) {
          //  printf("%s :\t%s\n",TAB[i].nom,TAB[i].add);
          inet_aton(TAB[i].add,&(S.sin_addr));
          /* initialisation du buffer */
          sprintf(buf,"3%s%s",CODPROTO,P[2]); /* envoi du mess no 3 */
          if (sendto(sid2,buf,strlen(buf),0,(struct sockaddr*)&S,sizeof(S))
              == -1) {
            perror("sendto"); sem_post(&SemTabs); return;
          }
        }
        sem_post(&SemTabs);
      }
      printf("Message envoye a tout le monde !\n");
      return;
     }
     AideBeui2(P[0]);
     return;
   } else {
     if (strcmp("on",P[1]) == 0) {
        if (EtatBeui2) {
           printf("Le serveur est deja actif !\n");
        } else {
          if (pthread_create(&ThBeui2, NULL, MainBeui2, NULL))
             printf("Erreur creation thread !!\n");
        }
        return;
     }
     if (strcmp("off",P[1]) == 0) {
        if (EtatBeui2) {
           EtatBeui2 = 0;
        } else {
           printf("Le serveur n'est pas actif !\n");
        }
        return;
     }
     if (strcmp("help",P[1]) == 0) {
        AideBeui2(P[0]); return;
     }
     if (strcmp("liste",P[1]) == 0) {
      if (EtatBeui2) { /* la liste n'existe QUE SI le serveur fonctionne */
        /* on commence par la liste des adresses locales */
        for (i=0; i< iA; i++) printf("Adresse locale :%s\n",ADLOC[i]);
        sem_wait(&SemTabs);
        for (i=0; i< iT; i++) printf("%s :\t%s\n",TAB[i].nom,TAB[i].add);
        sem_post(&SemTabs);
        return;
      }
     }
     printf("L'action %s n'est pas valable !\n",P[1]);
     AideBeui2(P[0]);
   }
}

void majComInt(void) /* mise a jour des commandes internes */
{
    /* creation du socket */
    if ((sid2 = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP)) == -1) {
     perror("socket");
     return;
    }
    ajouteCom("exit",Sortie);
    ajouteCom("pwd",Pwd);
    ajouteCom("cd",Chdir);
    ajouteCom("vers",Version);
    ajouteCom("beui2",Beui2);
}

void listeComInt(void)
{
int i;
   printf("Il y a %d commandes internes :",iTCom);
   for (i=0; i<iTCom; i++)
       printf("\t%s\n",TCom[i].nom);
}

int execComInt(int N, char **P)
{
int i;
   for (i=0; i<iTCom; i++) {
      if (strcmp(TCom[i].nom,P[0]) == 0) {
         TCom[i].com(N,P); return 1;
      }
   }
   return 0;
}

/**************** FIN Gestion des commandes internes *************/

int execComExt(char **P)
{
pid_t pid;

   if ((pid = fork()) == -1) {
      perror("fork"); return -1;
   }
   if (pid == 0) {
      execvp(P[0], P);
      perror(P[0]);
      _exit(127);
   }
   waitpid(pid,NULL,0);
   return 0;
}

char * getPrompt(void)
{
char host[LBUF];
char *u;
char p;
char *r = NULL;

   u = getenv("USER");
   if (u == NULL) u = "unknown";

   if (strcmp(u,"root")==0) p='#';
   else p='$';

   if (gethostname(host, sizeof(host)) == -1) {
      perror("gethostname");
      strncpy(host, "localhost", sizeof(host));
   }
   host[sizeof(host)-1] = '\0';

   if (asprintf(&r, "%s@%s%c ", u, host, p) == -1) {
      perror("asprintf");
      return NULL;
   }

   return r;
}

char ** Mots = NULL; /* le tableau des mots de la commande */
int NMots;
int analyseCom(char *b)
{
int i=0;
char *b2, *m;
void* M;
   b2 = strdup(b);
   while ((m=strsep(&b2," \t")) != NULL) {
     if (strlen(m) > 0) i++;
   }
#ifdef TRACE
   printf("Il y a %d mots dans la commande !\n",i);
#endif
   free((void*)b2);
   if ((M = malloc((i+1)*sizeof(char*))) == NULL) {
      perror("malloc");
      return -1;
   }
   if (Mots != NULL) free((void*)Mots);
   Mots = (char**)M;
   i=0;
   while ((m=strsep(&b," \t")) != NULL) {
     if (strlen(m) > 0) Mots[i++] = m;
   }
   Mots[i] = NULL;
   NMots = i;
   return NMots;
}

