#!/usr/bin/env python3
"""
alarm_remove_day.py  —  removes a specific alarm entirely from slot_N.json
                         when repeat=0 (one-time), or just a day when repeat=1

Usage: python3 alarm_remove_day.py <slot> <alarm_id> <day>
  slot     : 1 to 10
  alarm_id : alarm ID string (e.g. "a1x2y3")
  day      : 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun
"""

import sys
import json
import os

ALARM_DIR = "/config/alarm_data"

def main():
    if len(sys.argv) != 4:
        print("Usage: alarm_remove_day.py <slot> <alarm_id> <day>", file=sys.stderr)
        sys.exit(1)

    slot     = sys.argv[1]
    alarm_id = sys.argv[2]
    day      = sys.argv[3]

    if slot not in [str(i) for i in range(1, 11)]:
        print(f"Invalid slot: {slot}", file=sys.stderr)
        sys.exit(1)

    if day not in [str(i) for i in range(0, 7)]:
        print(f"Invalid day: {day}", file=sys.stderr)
        sys.exit(1)

    path = os.path.join(ALARM_DIR, f"slot_{slot}.json")

    if not os.path.exists(path):
        print(f"File not found: {path}", file=sys.stderr)
        sys.exit(1)

    try:
        with open(path, "r") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Read error: {e}", file=sys.stderr)
        sys.exit(1)

    alarms = data.get("alarms", [])
    found  = False

    for alarm in alarms:
        if alarm.get("id") == alarm_id:
            found = True
            days  = alarm.get("d", {})

            if day in days:
                day_data = days[day]
                repeat   = day_data.get("r", 1)

                if repeat == 0:
                    # One-time: remove the ENTIRE alarm
                    data["alarms"] = [a for a in alarms if a.get("id") != alarm_id]
                    print(f"Alarm {alarm_id} removed from slot {slot} (one-time)")
                else:
                    # Weekly repeat: just remove this day
                    del days[day]
                    alarm["d"] = days
                    if not days:
                        alarm["on"] = False
                    print(f"Day {day} removed from alarm {alarm_id} in slot {slot}")
            else:
                print(f"Day {day} not found in alarm {alarm_id}, nothing done")
            break

    if not found:
        print(f"Alarm {alarm_id} not found in slot {slot}", file=sys.stderr)
        sys.exit(1)

    try:
        with open(path, "w") as f:
            json.dump(data, f, separators=(",", ":"))
    except Exception as e:
        print(f"Write error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
