"""
conflict_detector.py
Decision Engine - Conflict Detection Module

Detects hard conflicts (overlapping times) and soft conflicts (buffer violations)
between proposed events and existing calendar events.
"""

from datetime import datetime


class ConflictDetector:

    def __init__(self, buffer_minutes=15):
        """
        Initialize with buffer time between events.
        
        Args:
            buffer_minutes: Minimum gap required between events (default: 15 mins)
                          - Hard conflict (OVERLAP): Times directly overlap
                          - Soft conflict (BUFFER_VIOLATION): Gap < buffer_minutes
        """
        self.buffer_minutes = buffer_minutes

    def check(self, proposed, existing_events):
        """
        Check proposed event against all existing events.
        
        Args:
            proposed: dict with 'start' and 'end' (datetime)
            existing_events: list of event dicts with 'start', 'end', 'title'
            
        Returns:
            dict with:
              - has_conflict: bool
              - conflicts: list of conflict dicts
        """
        conflicts = []

        for event in existing_events:
            result = self._compare(proposed, event)
            if result:
                conflicts.append(result)

        return {
            "has_conflict": len(conflicts) > 0,
            "conflicts": conflicts
        }

    def _compare(self, proposed, existing):
        """Compare two events and return conflict details if found."""
        p_start = proposed["start"]
        p_end = proposed["end"]
        e_start = existing["start"]
        e_end = existing["end"]

        # Hard conflict: times overlap
        if p_start < e_end and p_end > e_start:
            overlap_minutes = int(
                (min(p_end, e_end) - max(p_start, e_start)).total_seconds() / 60
            )
            return {
                "type": "OVERLAP",
                "severity": "HIGH",
                "with": existing["title"],
                "existing_start": e_start.strftime("%H:%M"),
                "existing_end": e_end.strftime("%H:%M"),
                "overlap_minutes": overlap_minutes,
                "message": (
                    f"Clashes with '{existing['title']}' "
                    f"({e_start.strftime('%H:%M')}–{e_end.strftime('%H:%M')}) "
                    f"— {overlap_minutes} min overlap."
                )
            }

        # Soft conflict: gap is smaller than buffer
        if p_end <= e_start:
            gap = int((e_start - p_end).total_seconds() / 60)
        else:
            gap = int((p_start - e_end).total_seconds() / 60)

        if 0 < gap < self.buffer_minutes:
            return {
                "type": "BUFFER_VIOLATION",
                "severity": "LOW",
                "with": existing["title"],
                "existing_start": e_start.strftime("%H:%M"),
                "existing_end": e_end.strftime("%H:%M"),
                "gap_minutes": gap,
                "message": (
                    f"Only {gap} min gap with '{existing['title']}' "
                    f"({e_start.strftime('%H:%M')}–{e_end.strftime('%H:%M')}) "
                    f"— below your {self.buffer_minutes}-min buffer."
                )
            }

        return None
