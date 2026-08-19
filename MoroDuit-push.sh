#!/bin/bash
# MoroDuit-push.sh — Auto commit & push MoroDuit ke GitHub
# Simpan ke: /home/moroxixi/HomeLab/MoroDuit/MoroDuit-push.sh
# chmod +x MoroDuit-push.sh
MORODUIT_DIR="/home/moroxixi/HomeLab/MoroDuit"
LOG="$MORODUIT_DIR/push.log"
cd "$MORODUIT_DIR" || exit 1

# ── Pastikan strategi pull sudah diset (merge biasa, tanpa nanya-nanya) ────
git config pull.rebase false >/dev/null 2>&1
git config core.editor "true" >/dev/null 2>&1

# ── Cari SSH agent yang aktif ──────────────────────────────────────────────
if [ -z "$SSH_AUTH_SOCK" ] || [ ! -S "$SSH_AUTH_SOCK" ]; then
    SSH_AGENT_SOCK=$(ls "$HOME"/.ssh/agent/s.*.agent.* 2>/dev/null | head -1)
    if [ -n "$SSH_AGENT_SOCK" ]; then
        export SSH_AUTH_SOCK="$SSH_AGENT_SOCK"
    fi
fi

# ── [Graphify] Update graph otomatis sebelum push ──────────────────────────
if ! command -v graphify >/dev/null 2>&1; then
    echo "$(date '+%H:%M') [Graphify] ERROR: command graphify tidak ditemukan." >> "$LOG"
    echo "❌ graphify tidak ditemukan — push dibatalkan."
    exit 4
fi

echo "$(date '+%H:%M') [Graphify] graphify update . ..." >> "$LOG"
if ! graphify update .; then
    echo "$(date '+%H:%M') [Graphify] ERROR: graphify update gagal." >> "$LOG"
    echo "❌ graphify update GAGAL — push dibatalkan."
    exit 4
fi

echo "$(date '+%H:%M') [Graphify] graphify update OK." >> "$LOG"

MANIFEST="$MORODUIT_DIR/graphify-out/manifest.json"
if [ ! -f "$MANIFEST" ]; then
    echo "$(date '+%H:%M') [Graphify] ERROR: manifest.json tidak ada: $MANIFEST" >> "$LOG"
    echo "❌ manifest.json tidak ditemukan setelah graphify update — push dibatalkan."
    exit 5
fi

echo "$(date '+%H:%M') [Graphify] gen-folder-tree.py ..." >> "$LOG"
if ! python3 ~/.local/bin/gen-folder-tree.py "$MANIFEST"; then
    echo "$(date '+%H:%M') [Graphify] ERROR: gen-folder-tree.py gagal." >> "$LOG"
    echo "❌ gen-folder-tree.py GAGAL — push dibatalkan."
    exit 6
fi

# Kalau graphify-out/ ter-track git → stage perubahannya
if git ls-files graphify-out | grep -q .; then
    echo "$(date '+%H:%M') [Graphify] graphify-out tracked — git add." >> "$LOG"
    git add graphify-out/
fi

echo "$(date '+%H:%M') [Graphify] selesai." >> "$LOG"

# ── Cek apakah ada perubahan ───────────────────────────────────────────────
if [ -z "$(git status --porcelain)" ]; then
    echo "$(date '+%H:%M') [Git] Tidak ada perubahan, skip." >> "$LOG"
    echo "ℹ️  Tidak ada perubahan."
    notify-send "MoroDuit" "Tidak ada perubahan" --urgency=low 2>/dev/null
    exit 0
fi

# ── Commit ──────────────────────────────────────────────────────────────
git add -A
COMMIT_MSG="${1:-auto: $(date '+%Y-%m-%d %H:%M')}"
git commit -m "$COMMIT_MSG"

# ── Pull dulu sebelum push ─────────────────────────────────────────────────
PULL_OUTPUT=$(git pull origin main --no-edit 2>&1)
PULL_STATUS=$?
echo "$PULL_OUTPUT" >> "$LOG"

if [ $PULL_STATUS -ne 0 ]; then
    echo "$(date '+%H:%M') [Git] Pull GAGAL / ada konflik:" >> "$LOG"
    echo ""
    echo "❌ Pull gagal / ada konflik — push dibatalkan:"
    echo "$PULL_OUTPUT"
    echo ""
    echo "👉 Beresin manual dulu: cek 'git status', selesaikan konflik di file yang ditandai,"
    echo "   lalu 'git add <file>' dan 'git commit', baru jalankan script ini lagi."
    notify-send "MoroDuit" "❌ Konflik saat pull! Perlu beresin manual" --urgency=critical 2>/dev/null
    exit 1
fi

# ── Push ────────────────────────────────────────────────────────────────
PUSH_OUTPUT=$(git push origin main 2>&1)
PUSH_STATUS=$?
echo "$PUSH_OUTPUT" >> "$LOG"
if [ $PUSH_STATUS -eq 0 ]; then
    echo "$(date '+%H:%M') [Git] Push berhasil: $COMMIT_MSG" >> "$LOG"
    echo "✅ Push berhasil: $COMMIT_MSG"
    notify-send "MoroDuit" "📤 MoroDuit di-push ke GitHub" --urgency=low 2>/dev/null
else
    echo "$(date '+%H:%M') [Git] Push GAGAL:" >> "$LOG"
    echo "$PUSH_OUTPUT" >> "$LOG"
    echo ""
    echo "❌ Push GAGAL:"
    echo "$PUSH_OUTPUT"
    notify-send "MoroDuit" "❌ Push gagal! $PUSH_OUTPUT" --urgency=critical 2>/dev/null
    exit 7
fi

exit 0
