#!/usr/bin/env python3
"""
alarm_write.py  —  writes alarm data to /config/alarm_data/slot_N.json
Usage: python3 alarm_write.py <slot> <base64-data>
  slot    : 1 to 10
  base64  : base64-encoded JSON string
"""

import sys
import json
import base64
import os

ALARM_DIR = "/config/alarm_data"

def main():
    if len(sys.argv) != 3:
        print("Usage: alarm_write.py <slot> <base64data>", file=sys.stderr)
        sys.exit(1)

    slot    = sys.argv[1]
    b64data = sys.argv[2]

    if slot not in [str(i) for i in range(1, 11)]:
        print(f"Invalid slot: {slot}", file=sys.stderr)
        sys.exit(1)

    try:
        raw  = base64.b64decode(b64data).decode("utf-8")
        data = json.loads(raw)
    except Exception as e:
        print(f"Decode error: {e}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(ALARM_DIR, exist_ok=True)
    path = os.path.join(ALARM_DIR, f"slot_{slot}.json")

    try:
        with open(path, "w") as f:
            json.dump(data, f, separators=(",", ":"))
        print(f"Written: {path}")
    except Exception as e:
        print(f"Write error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
