from datetime import datetime
class ConflictDetector:

    def __init__(self, buffer_minutes=15):
#Here we have considered a buffer time of 15 mins between 2 events , if it clashes , then it is considered a soft conflict. 
        self.buffer_minutes = buffer_minutes

    def check(self, proposed, existing_events):

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
        p_start = proposed["start"]
        p_end   = proposed["end"]
        e_start = existing["start"]
        e_end   = existing["end"]

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
                "existing_end":   e_end.strftime("%H:%M"),
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
                "existing_end":   e_end.strftime("%H:%M"),
                "gap_minutes": gap,
                "message": (
                    f"Only {gap} min gap with '{existing['title']}' "
                    f"({e_start.strftime('%H:%M')}–{e_end.strftime('%H:%M')}) "
                    f"— below your {self.buffer_minutes}-min buffer."
                )
            }

        return None  
