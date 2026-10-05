#!/usr/bin/env bash
# Compile Civet sources and tests to TypeScript under build/.
#
# Civet closes a function body by dedent, so there is no `}` to write and no `{`
# to open. Both mistakes are easy to make and produce a parse error pointing at
# an unrelated line, so they are checked before compiling:
#
#   1. `const X := v` is invalid — `const` already declares, so the assignment
#      operator is redundant. Use `const X = v`, or a bare `X := v`.
#   2. A `}` alone on a line closes nothing.
#   3. A `{` after a function signature opens a block that dedent never closes.
#   4. A `{` in return-type position is parsed as the start of that block. Use
#      a named type alias instead of an inline object type.
#
# Tests are compiled too because `bun test` only collects .js/.ts files. Source
# and test output sit at the same depth under build/, so a test's
# `../src/x.civet` import resolves to `build/src/x.ts` unchanged.
set -uo pipefail

cd "$(dirname "$0")/.."

status=0

bad=$(grep -rn 'const [A-Za-z_][A-Za-z0-9_]* :=' src/ test/ 2>/dev/null || true)
if [ -n "$bad" ]; then
  echo "Rule 1 — 'const X :=' is not valid Civet. Use 'const X =' or a bare 'X :='."
  echo "$bad"
  status=1
fi

# A '}' alone on a line is only wrong when it closes a Civet function body,
# which dedent has already closed. Distinguishing that from a legitimate brace
# block (a `test(() => { ... })` callback) is not reliable lexically, so this
# case is left to the parser: it reports the stray brace directly, and the
# fix is to delete it.

opened=$(grep -rnE '^(export )?(async )?function [A-Za-z_][A-Za-z0-9_]*\(.*\) \{$' src/ test/ 2>/dev/null || true)
if [ -n "$opened" ]; then
  echo "Rule 3 — no '{' after a function signature; the body closes by dedent."
  echo "$opened"
  status=1
fi

inlined=$(grep -rnE '^(export )?(async )?function [A-Za-z_][A-Za-z0-9_]*\(.*\): *\{' src/ test/ 2>/dev/null || true)
if [ -n "$inlined" ]; then
  echo "Rule 4 — no '{' in return-type position; use a named type alias."
  echo "$inlined"
  status=1
fi

# Civet 0.11.16 compiles the infix `isnt` to a CALL: `a isnt b` becomes
# `a(isnt(b))`. It parses and typechecks cleanly and only throws at runtime, so
# nothing else in the toolchain will catch it. `is` is fine; only `isnt` is
# affected. Use `!=`.
isnt=$(grep -rn ' isnt ' src/ test/ 2>/dev/null || true)
if [ -n "$isnt" ]; then
  echo "Rule 5 — infix 'isnt' compiles to a call (a(isnt(b))). Use '!=' instead."
  echo "$isnt"
  status=1
fi

# Belt and braces, checked against the COMPILED output after the build rather
# than against build/ beforehand, which would only see the previous run's files.
rm -rf build
mkdir -p build/src build/test

shopt -s nullglob
srcs=(src/*.civet)
tests=(test/*.civet)

if [ "${#srcs[@]}" -gt 0 ]; then
  bunx civet -c "${srcs[@]}" -o build/src/.ts || exit 1
fi

if [ "${#tests[@]}" -gt 0 ]; then
  bunx civet -c "${tests[@]}" -o build/test/.ts || exit 1
fi

emitted=$(grep -rn 'isnt(' build/src build/test 2>/dev/null || true)
if [ -n "$emitted" ]; then
  echo "Compiled output contains an isnt() call — the source check missed one."
  echo "$emitted"
  exit 1
fi

# Civet parses a brace-bodied arrow (`() => {`) as an object literal whenever a
# line in its body starts with `identifier(`. Test bodies are full of such lines,
# so `test('x', () => { expect(...).toBe(...) })` silently becomes
# `test('x', () => ({ toBe: expect(...).toBe(...) }))` — an object, not an
# assertion. It even still runs, so nothing else catches it. Indentation bodies
# (`() =>` with the body dedented) compile as written.
braces=$(grep -rn '() => *{' test/*.civet 2>/dev/null || true)
if [ -n "$braces" ]; then
  echo "Rule 6 — use an indentation body, not '=> {', in test callbacks."
  echo "$braces"
  exit 1
fi

echo "compiled ${#srcs[@]} source file(s), ${#tests[@]} test file(s)"
