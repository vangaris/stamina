#!/usr/bin/env bash
# Prints the build-ticket board from the ticket files (the single source of truth).
# Usage: scripts/tickets.sh [ticket-dir]   (default: .scratch/mvp-build/issues)
# Works with macOS's stock bash 3.2 (no associative arrays).
set -euo pipefail
dir="${1:-$(cd "$(dirname "$0")/.." && pwd)/.scratch/mvp-build/issues}"

status_of_file() { sed -nE 's/^\*\*Status:\*\* *//p' "$1" | head -1; }
status_of_num() { local f; f=$(ls "$dir"/"$1"-*.md 2>/dev/null | head -1); [ -n "$f" ] && status_of_file "$f" || echo "missing"; }

next=""; total=0; done_count=0
printf '%-3s %-15s %-6s %-14s %s\n' "#" "status" "boxes" "waiting on" "ticket"
for f in "$dir"/[0-9][0-9]-*.md; do
  n=$(basename "$f" | cut -c1-2)
  title=$(head -1 "$f" | sed -E 's/^# [0-9]+: //')
  st=$(status_of_file "$f")
  total=$((total + 1)); [ "$st" = "done" ] && done_count=$((done_count + 1))
  ticked=$(grep -c '^- \[x\]' "$f" || true)
  boxes=$(grep -c '^- \[[ x]\]' "$f" || true)
  waiting=""
  for b in $(sed -nE 's/^\*\*Blocked by:\*\* //p' "$f" | grep -oE '(^|, )[0-9]{2}:' | grep -oE '[0-9]{2}' || true); do
    [ "$(status_of_num "$b")" = "done" ] || waiting="$waiting $b"
  done
  w="${waiting# }"; [ -z "$w" ] && w="-"
  mark=""
  [ "$st" = "in-progress" ] && mark="  <- IN PROGRESS"
  if [ -z "$next" ] && [ "$st" = "ready-for-agent" ] && [ "$w" = "-" ]; then next="$n"; mark="  <- NEXT"; fi
  printf '%-3s %-15s %-6s %-14s %s%s\n' "$n" "$st" "$ticked/$boxes" "$w" "$title" "$mark"
done
echo
echo "Done: $done_count / $total tickets. Next: ${next:-none (check in-progress or blocked)}"
