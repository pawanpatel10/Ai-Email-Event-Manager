'''decision_maker.py
Member 3 — Decision & Conflict Intelligence Engineer

Ties everything together. Takes Member 2's event output,
runs conflict detection, finds free slots if needed,
and returns a final decision.

Decision outcomes:
  AUTO_SCHEDULE   → no conflicts, high confidence → tell Member 1 to create event
  SUGGEST_SLOTS   → conflict found → send alternatives to Member 4 for user to pick
  NEEDS_REVIEW    → low confidence or missing data → ask user to confirm'''

from datetime import datetime, timedelta
from conflict_detector import ConflictDetector
from slot_finder import SlotFinder


class DecisionMaker:

    # Confidence threshold for auto-scheduling
    AUTO_SCHEDULE_THRESHOLD = 0.85

    def __init__(self, buffer_minutes=15, top_n=3):
        self.detector = ConflictDetector(buffer_minutes=buffer_minutes)
        self.finder   = SlotFinder(top_n=top_n)

    def decide(self, raw_event, existing_events):
        """
        Main entry point.

        raw_event       : dict from Member 2 (date, time, end_time, duration,
                          event_context, location, confidence)
        existing_events : list of calendar event dicts from Member 1

        Returns a decision dict ready to send to Member 1 and Member 4.
        """

        # ── Step 1: Parse Member 2's format ───────────────────────────
        proposed = self._parse(raw_event)
        if proposed is None:
            return self._outcome(
                action   = "NEEDS_REVIEW",
                proposed = None,
                reason   = "Could not parse event date/time from email.",
                conflicts= [],
                slots    = [],
                raw      = raw_event,
            )

        # ── Step 2: Low confidence → don't act autonomously ───────────
        confidence = raw_event.get("confidence", 0.0)
        if confidence < self.AUTO_SCHEDULE_THRESHOLD:
            return self._outcome(
                action   = "NEEDS_REVIEW",
                proposed = proposed,
                reason   = f"Confidence {confidence:.0%} is below threshold. User confirmation needed.",
                conflicts= [],
                slots    = [],
                raw      = raw_event,
            )

        # ── Step 3: Run conflict detection ────────────────────────────
        conflict_result = self.detector.check(proposed, existing_events)

        # ── Step 4a: No conflict → auto schedule ──────────────────────
        if not conflict_result["has_conflict"]:
            return self._outcome(
                action   = "AUTO_SCHEDULE",
                proposed = proposed,
                reason   = "No conflicts found. High confidence. Scheduling automatically.",
                conflicts= [],
                slots    = [],
                raw      = raw_event,
            )

        # ── Step 4b: Only soft conflicts (buffer) → still auto schedule
        hard = [c for c in conflict_result["conflicts"] if c["type"] == "OVERLAP"]
        soft = [c for c in conflict_result["conflicts"] if c["type"] == "BUFFER_VIOLATION"]

        if not hard and soft:
            return self._outcome(
                action   = "AUTO_SCHEDULE",
                proposed = proposed,
                reason   = (
                    f"Minor buffer warning with "
                    f"'{soft[0]['with']}' ({soft[0]['gap_minutes']} min gap), "
                    f"but no hard conflict. Scheduling anyway."
                ),
                conflicts= soft,
                slots    = [],
                raw      = raw_event,
            )

        # ── Step 4c: Hard conflict → find alternatives ────────────────
        free_slots = self.finder.find(proposed, existing_events)

        if free_slots:
            return self._outcome(
                action   = "SUGGEST_SLOTS",
                proposed = proposed,
                reason   = (
                    f"Conflict with '{hard[0]['with']}' at "
                    f"{hard[0]['existing_start']}–{hard[0]['existing_end']}. "
                    f"Here are {len(free_slots)} alternative slots."
                ),
                conflicts= conflict_result["conflicts"],
                slots    = free_slots,
                raw      = raw_event,
            )

        # ── Step 4d: Conflict + no free slots → escalate to user ──────
        return self._outcome(
            action   = "NEEDS_REVIEW",
            proposed = proposed,
            reason   = "Hard conflict found and no free slots available today. User must decide.",
            conflicts= conflict_result["conflicts"],
            slots    = [],
            raw      = raw_event,
        )

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _parse(self, data):
        """Convert Member 2's raw dict into a usable event dict."""
        try:
            start = datetime.strptime(
                f"{data['date']} {data['time']}", "%Y-%m-%d %H:%M:%S"
            )
            if data.get("end_time"):
                end = datetime.strptime(
                    f"{data['date']} {data['end_time']}", "%Y-%m-%d %H:%M:%S"
                )
            else:
                duration = data.get("duration", 60)
                end = start + timedelta(minutes=duration)

            return {
                "title":      data.get("event_context", "Untitled Event"),
                "start":      start,
                "end":        end,
                "location":   data.get("location", ""),
                "confidence": data.get("confidence", 1.0),
            }
        except Exception:
            return None

    def _outcome(self, action, proposed, reason, conflicts, slots, raw):
        """Build the final structured response for Member 1 and Member 4."""
        return {
            "action":   action,
            "reason":   reason,
            "event":    {
                "title":    proposed["title"]    if proposed else raw.get("event_context", "Unknown"),
                "start":    proposed["start"].isoformat() if proposed else None,
                "end":      proposed["end"].isoformat()   if proposed else None,
                "location": proposed["location"] if proposed else raw.get("location", ""),
            },
            "conflicts": conflicts,
            "suggested_slots": [
                {"start": s["start"].isoformat(), "end": s["end"].isoformat(), "label": s["label"]}
                for s in slots
            ],
        }
