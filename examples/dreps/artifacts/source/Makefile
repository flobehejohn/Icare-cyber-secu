CC ?= cc
CFLAGS ?= -Wall -Wextra -Wpedantic -std=gnu11 -g -O2
LDFLAGS ?=
LDLIBS ?= -lreadline -pthread

TARGET := icare
SOURCES := icare.c gescom.c
OBJECTS := $(SOURCES:.c=.o)

.PHONY: all clean rebuild check-deps smoke negative test asan audit

all: $(TARGET)

$(TARGET): $(OBJECTS)
	$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)

%.o: %.c gescom.h
	$(CC) $(CFLAGS) -c $< -o $@

check-deps:
	@command -v cc >/dev/null || { echo "cc manquant"; exit 1; }
	@command -v make >/dev/null || { echo "make manquant"; exit 1; }
	@test -f /usr/include/readline/readline.h || { echo "libreadline-dev manquant"; exit 1; }

clean:
	rm -f $(TARGET) $(OBJECTS)

rebuild: clean all

smoke: all
	printf 'pwd\nvers\necho Programme_OK\ncd /tmp ; pwd ; echo Test_OK\nexit\n' | ./$(TARGET) -n ci -t

negative: all
	@out="$$(printf 'commande_inconnue\nexit\n' | ./$(TARGET) -n ci -t 2>&1)"; \
	echo "$$out"; \
	echo "$$out" | grep -q "commande_inconnue"; \
	count="$$(echo "$$out" | grep -c "Au revoir")"; \
	test "$$count" -eq 1

test: smoke negative

asan:
	$(MAKE) clean
	$(MAKE) CFLAGS="-Wall -Wextra -Wpedantic -std=gnu11 -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer" LDFLAGS="-fsanitize=address,undefined"
	printf 'pwd\nvers\necho ASAN_OK\nexit\n' | ./$(TARGET) -n asan -t

audit:
	bash scripts/quality/validate-full.sh
