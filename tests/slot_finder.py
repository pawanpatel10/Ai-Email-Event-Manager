
"""
slot_finder.py
Member 3 — Decision & Conflict Intelligence Engineer

When a conflict is detected, this module scans the same day
and finds the next available free time slots for the proposed event.

Input  : proposed event (start, end) + list of existing calendar events
Output : list of free slots, sorted earliest first
"""

from datetime import datetime, timedelta


class SlotFinder:

    def __init__(self, working_start="09:00", working_end="21:00", top_n=3):
        """
        working_start : earliest time a slot can begin (default 9 AM)
        working_end   : latest time a slot can end     (default 9 PM)
        top_n         : how many alternatives to return
        """
        self.working_start = working_start
        self.working_end   = working_end
        self.top_n         = top_n

    def find(self, proposed, existing_events):
        """
        Find free slots on the same day as the proposed event.

        proposed        : dict with title, start, end (datetime)
        existing_events : list of dicts with start, end (datetime)

        Returns a list of dicts:
          { "start": datetime, "end": datetime, "label": str }
        """
        date        = proposed["start"].date()
        duration    = proposed["end"] - proposed["start"]   # timedelta

        # Build the working window for that day
        day_start = datetime.strptime(
            f"{date} {self.working_start}", "%Y-%m-%d %H:%M"
        )
        day_end = datetime.strptime(
            f"{date} {self.working_end}", "%Y-%m-%d %H:%M"
        )

        # Collect and sort all busy blocks from existing events
        busy = sorted(
            [
                (e["start"], e["end"])
                for e in existing_events
                if e["start"].date() == date
            ],
            key=lambda x: x[0]
        )

        # Merge overlapping busy blocks
        busy = self._merge(busy)

        # Walk through the day and collect free windows
        free_slots = []
        cursor = day_start

        for busy_start, busy_end in busy:
            if cursor + duration <= busy_start:
                # There's a free window before this busy block
                free_slots.append({
                    "start": cursor,
                    "end":   cursor + duration,
                    "label": f"{cursor.strftime('%H:%M')}–{(cursor + duration).strftime('%H:%M')}"
                })
            # Jump past this busy block
            cursor = max(cursor, busy_end)

        # Check for a free window after the last busy block
        if cursor + duration <= day_end:
            free_slots.append({
                "start": cursor,
                "end":   cursor + duration,
                "label": f"{cursor.strftime('%H:%M')}–{(cursor + duration).strftime('%H:%M')}"
            })

        return free_slots[:self.top_n]

    def _merge(self, intervals):
        """Merge overlapping busy intervals into clean blocks."""
        if not intervals:
            return []

        merged = [intervals[0]]
        for start, end in intervals[1:]:
            if start <= merged[-1][1]:
                merged[-1] = (merged[-1][0], max(merged[-1][1], end))
            else:
                merged.append((start, end))
        return merged
