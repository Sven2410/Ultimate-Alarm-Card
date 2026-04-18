# Alarm Card for Home Assistant

**Version 1.2.0**

A fully featured alarm card for Home Assistant with an iPhone-style interface. Supports multiple alarms per person, per-day settings, Music Assistant integration, wake-up lights, and server-side execution via a blueprint — no open browser required.

---

## Features

- 📱 **iPhone-style UI** — list of alarms with add, edit, delete and toggle
- ⏰ **Multiple alarms per slot** — up to 10 alarms per person
- 📅 **Per-day settings** — each day has its own speaker, sound, volume, light and brightness
- 🎵 **Music Assistant integration** — browse and select playlists, radio, Spotify
- 🔀 **Shuffle** — playlists are automatically shuffled on playback
- 🔊 **24 built-in alarm sounds** — included in the repository
- 💡 **Wake-up light** — turn on a light at alarm time
- 🔁 **Repeat weekly or one-time** — one-time alarms are automatically deleted after firing
- 🏷️ **Optional alarm name** — label alarms like "Work", "Weekend"
- 🖥️ **Server-side execution** — works without any open browser or app
- 👥 **Multi-user** — one card per person, separate slots (1–10)

---

## Requirements

- Home Assistant 2024.1.0 or newer
- HACS installed
- [Music Assistant](https://music-assistant.io/) (optional, for browsing media)

---

## Installation

### Step 1 — Install via HACS

1. Open HACS → Frontend
2. Click ⋮ → **Custom repositories**
3. Add `https://github.com/Sven2410/Ultimate-Alarm-Card` with category **Dashboard**
4. Find **Alarm Card** and click **Install**

HACS automatically copies:
- `dist/alarm-card.js` → `/config/www/community/Ultimate-Alarm-Card/dist/alarm-card.js`
- `sounds/wekker-standaard/*.mp3` → `/config/www/community/Ultimate-Alarm-Card/sounds/wekker-standaard/`

### Step 2 — Create folders and copy scripts

In the Home Assistant terminal (Terminal & SSH add-on or Studio Code Server):

```bash
mkdir -p /config/alarm_data
mkdir -p /config/alarm_scripts
cp /config/www/community/Ultimate-Alarm-Card/scripts_alarm/alarm_write.py /config/alarm_scripts/
cp /config/www/community/Ultimate-Alarm-Card/scripts_alarm/alarm_remove_day.py /config/alarm_scripts/
```

> **Note:** The scripts are included in this repository under `scripts_alarm/`. HACS copies them to the community folder so you can copy them from there.

### Step 3 — Add shell commands

Add to `/config/shell_commands.yaml` (or under `shell_command:` in `configuration.yaml`):

```yaml
alarm_write: "python3 /config/alarm_scripts/alarm_write.py {{ slot }} {{ data_b64 }}"
alarm_remove_day: "python3 /config/alarm_scripts/alarm_remove_day.py {{ slot }} {{ alarm_id }} {{ dag }}"
```

### Step 4 — Add command_line sensors

Add to `configuration.yaml`. Add one sensor per slot you need (up to 10):

```yaml
command_line:
  - sensor:
      name: "Alarm Slot 1"
      unique_id: alarm_slot_1
      command: "cat /config/alarm_data/slot_1.json 2>/dev/null || echo '{\"alarms\":[]}'"
      scan_interval: 15
      value_template: "ok"
      json_attributes:
        - "alarms"
  - sensor:
      name: "Alarm Slot 2"
      unique_id: alarm_slot_2
      command: "cat /config/alarm_data/slot_2.json 2>/dev/null || echo '{\"alarms\":[]}'"
      scan_interval: 15
      value_template: "ok"
      json_attributes:
        - "alarms"
  # Repeat for slots 3–10 as needed (max 10)
```

### Step 5 — Restart Home Assistant

**Settings → System → Restart**

After restart, verify `sensor.alarm_slot_1` appears in **Developer Tools → States** with `state: ok`.

### Step 6 — Add the resource

Go to **Settings → Dashboards → Resources → Add resource**:

- URL: `/local/community/Ultimate-Alarm-Card/dist/alarm-card.js`
- Resource type: JavaScript module

### Step 7 — Add the card

Edit your dashboard → Add card → **Custom: alarm-card-1**

In the card editor, set the **Slot** number:
- Slot 1 = Person 1
- Slot 2 = Person 2
- etc.

### Step 8 — Import the blueprint

1. Go to **Settings → Automations → Blueprints**
2. Click **Import blueprint**
3. Paste the URL of the blueprint from this repository
4. Create a new automation from the blueprint
5. Fill in your Home Assistant base URL and save

---

## Entity Labels

The card uses labels to filter which entities appear in the dropdowns.

### Speaker filter — label: `Music Assistant`

Only media players with this label appear in the speaker dropdown.

1. **Settings → Devices & Services → Entities**
2. Find your Music Assistant media player
3. Open it → add label **Music Assistant**

### Light filter — label: `Verlichting Wekker`

Only lights with this label appear in the light dropdown.

1. **Settings → Devices & Services → Entities**
2. Find your wake-up light(s)
3. Open it → add label **Verlichting Wekker**

---

## Usage

### Adding an alarm

1. Tap **Wekker toevoegen**
2. Optionally enter a name
3. Select active days
4. Open each day to configure: speaker, sound, volume, light, brightness, repeat
5. Tap **Opslaan** — alarm is automatically enabled

### Repeat options

- **Repeat weekly ON** — alarm fires every week on that day. Shows "Elke maandag" in the overview.
- **Repeat weekly OFF** (default) — alarm fires once and is automatically deleted afterwards.

### Editing / deleting

- Tap the alarm row to edit
- Tap 🗑️ to delete

---

## Data storage

```
/config/alarm_data/slot_1.json   ← Person 1
/config/alarm_data/slot_2.json   ← Person 2
...
/config/alarm_data/slot_10.json  ← Person 10
```

Files are created automatically when saving the first alarm. Included in standard HA backups.

---

## Repository structure

```
Ultimate-Alarm-Card/
├── hacs.json
├── README.md
├── dist/
│   └── alarm-card.js          ← Main card file (auto-installed by HACS)
├── scripts_alarm/
│   ├── alarm_write.py         ← Write script (copy manually)
│   └── alarm_remove_day.py    ← Remove script (copy manually)
└── sounds/
    └── wekker-standaard/
        └── *.mp3              ← 24 alarm sounds (auto-installed by HACS)
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Card shows "Stel een slot in via het potlood" | Open card editor and set a slot number |
| Speaker dropdown is empty | Add label **Music Assistant** to your media player entities |
| Light dropdown is empty | Add label **Verlichting Wekker** to your light entities |
| Alarm does not fire | Check the blueprint automation is enabled. Verify the sensor has `alarms` attribute. |
| Sensor has no `alarms` attribute | Run: `echo '{"alarms":[]}' > /config/alarm_data/slot_1.json` |

---

## Changelog

### 1.2.0
- Repeat weekly now defaults to **off** (one-time)
- Alarm sounds moved to HACS community folder structure
- MP3 path updated to `/local/community/Ultimate-Alarm-Card/sounds/wekker-standaard/`
- Blueprint removed from repository (import separately)

### 1.1.0
- UI fully in Dutch
- Shuffle enabled for playlist playback
- One-time alarms now delete the entire alarm after firing (not just the day)
- Weekly repeat label: "Elke maandag" instead of "Ma"
- Fixed double-firing: JS ticker disabled, blueprint handles all alarm execution
- Wake-up light shown in alarm overview

### 1.0.0 — Initial Release
- Multi-alarm UI with iPhone-style list
- Up to 10 alarms per slot, up to 10 slots
- Per-day speaker, sound, volume, light, brightness, repeat
- Music Assistant media browser integration
- 24 built-in alarm sounds

---

## License

MIT License
 enabled. Verify `sensor.alarm_slot_1` has `alarms` attribute in Developer Tools → States |
| Sensor has no `alarms` attribute | Save an alarm via the card — this creates the data file automatically |
| Media browser shows "Geen media gevonden" | Make sure Music Assistant is running and the speaker entity is correct |

---

## Changelog

### 1.2.0
- Repeat weekly now defaults to **off** (one-time)
- All files moved to HACS community folder structure
- MP3 path: `/local/community/Ultimate-Alarm-Card/sounds/wekker-standaard/`
- `/config/alarm_data/` created automatically on first save — no manual setup needed
- Blueprint removed from repository (import separately via HA blueprint import)

### 1.1.0
- UI fully in Dutch
- Shuffle enabled for playlist playback
- One-time alarms now delete the entire alarm after firing
- Weekly repeat label: "Elke maandag" instead of "Ma"
- Fixed double-firing: JS ticker disabled, blueprint handles all alarm execution
- Wake-up light shown in alarm overview

### 1.0.0 — Initial Release
- Multi-alarm UI with iPhone-style list
- Up to 10 alarms per slot, up to 10 slots
- Per-day speaker, sound, volume, light, brightness, repeat
- Music Assistant media browser integration
- 24 built-in alarm sounds

---

## License

MIT License — feel free to use, modify and distribute.
