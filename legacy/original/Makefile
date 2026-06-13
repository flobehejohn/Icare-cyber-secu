# Makefile pour le programme icare
# Ajouter -DTRACE a CFLAGS pour inclure les traces.
CFLAGS = -Wall
LDFLAGS = -lreadline -pthread

icare : icare.o gescom.o
	cc -o icare icare.o gescom.o $(LDFLAGS)

icare.o : icare.c gescom.h
	cc -c $(CFLAGS) icare.c

gescom.o : gescom.c gescom.h
	cc -c $(CFLAGS) gescom.c

clean :
	rm -f icare *.o

