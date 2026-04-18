#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Ultimate Alarm Card — one-time setup script
# Run this once after installing via HACS:
#   bash /config/www/community/Ultimate-Alarm-Card/install.sh
# ═══════════════════════════════════════════════════════════════

REPO="https://raw.githubusercontent.com/Sven2410/Ultimate-Alarm-Card/main"
SOUNDS="/config/www/community/Ultimate-Alarm-Card/sounds/wekker-standaard"
SCRIPTS="/config/alarm_scripts"

echo "═══════════════════════════════════════════"
echo "  Ultimate Alarm Card — Setup"
echo "═══════════════════════════════════════════"

# ── Mappen aanmaken ─────────────────────────────────────────────
mkdir -p "$SOUNDS"
mkdir -p "$SCRIPTS"
echo "✓ Folders created"

# ── MP3 bestanden downloaden ─────────────────────────────────────
echo ""
echo "Downloading alarm sounds..."
SOUNDS_LIST=(
  Arpeggio Breaking Canopy Chalet Chirp Daybreak
  Departure Dollop Journey Kettle Little_bird Mercury
  Milky_way Quad Radial Reflection Scavenger Seedling
  Shelter Sprinkles Steps Storytime Tease Unfold
)

for sound in "${SOUNDS_LIST[@]}"; do
  wget -q -O "$SOUNDS/${sound}.mp3" "$REPO/sounds/wekker-standaard/${sound}.mp3"
  if [ $? -eq 0 ]; then
    echo "  ✓ ${sound}.mp3"
  else
    echo "  ✗ ${sound}.mp3 — download failed"
  fi
done

# ── Python scripts downloaden ─────────────────────────────────────
echo ""
echo "Downloading scripts..."

wget -q -O "$SCRIPTS/alarm_write.py" "$REPO/scripts_alarm/alarm_write.py"
if [ $? -eq 0 ]; then
  echo "  ✓ alarm_write.py"
else
  echo "  ✗ alarm_write.py — download failed"
fi

wget -q -O "$SCRIPTS/alarm_remove_day.py" "$REPO/scripts_alarm/alarm_remove_day.py"
if [ $? -eq 0 ]; then
  echo "  ✓ alarm_remove_day.py"
else
  echo "  ✗ alarm_remove_day.py — download failed"
fi

# ── Klaar ─────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
echo "  Setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Add shell commands to shell_commands.yaml"
echo "  2. Add command_line sensors to configuration.yaml"
echo "  3. Restart Home Assistant"
echo "  4. Add the card resource in dashboard settings"
echo "  5. Import the blueprint"
echo ""
echo "  See README for full instructions:"
echo "  https://github.com/Sven2410/Ultimate-Alarm-Card"
echo "═══════════════════════════════════════════"
