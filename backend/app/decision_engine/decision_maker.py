"""
decision_maker.py
Decision Engine - Intelligent Decision Making Module

Main orchestrator that ties everything together. Takes NLP output,
runs conflict detection, finds free slots if needed, and returns
a final agentic decision.

Decision outcomes:
  AUTO_SCHEDULE   → no conflicts, high confidence → autonomously create event
  SUGGEST_SLOTS   → conflict found → present alternatives
  NEEDS_REVIEW    → low confidence or missing data → ask user to confirm
  ESCALATE_AGENT  → complex scenario → use LLM for reasoning
"""

from datetime import datetime, timedelta
from conflict_detector import ConflictDetector
from slot_finder import SlotFinder


class DecisionMaker:

    # Confidence thresholds for autonomous decision-making
    LLM_ESCALATION_THRESHOLD = 0.50
    IGNORE_THRESHOLD = 0.30

    def __init__(self, buffer_minutes=15, top_n=3, user_preferences=None):
        """
        Initialize the decision maker with agentic capabilities.
        
        Args:
            buffer_minutes: buffer time between events
            top_n: number of slot suggestions
            user_preferences: dict with user's scheduling preferences
                            {
                              'buffer_minutes': int,
                              'working_hours': {'start': 'HH:MM', 'end': 'HH:MM'},
                              'auto_schedule_enabled': bool,
                              'preferred_buffer': int
                            }
        """
        self.detector = ConflictDetector(buffer_minutes=buffer_minutes)
        self.finder = SlotFinder(top_n=top_n)
        self.user_preferences = user_preferences or {}

    def decide(self, raw_event, existing_events, user_data=None, current_priority=0):
        """
        Main agentic decision logic.

        Args:
            raw_event: dict from NLP module with keys:
                      date, time, end_time, duration, event_context,
                      location, confidence, emailId, fromEmail
            existing_events: list of calendar events (start, end, title, id, priorityScore)
            user_data: dict with user info for preference learning
            current_priority: int computed priority of the current event


        Returns:
            decision dict with action, reason, event details, conflicts, slots
        """

        # ── Step 1: Parse and validate event data ───────────────────────
        proposed = self._parse(raw_event)
        if proposed is None:
            return self._outcome(
                action="NEEDS_REVIEW",
                proposed=None,
                reason="Could not parse event date/time from email.",
                conflicts=[],
                slots=[],
                raw=raw_event,
                agent_reasoning="Missing or invalid date/time data",
                current_priority=current_priority
            )

        # ── Step 2: Check confidence level ───────────────────────────────
        confidence = raw_event.get("confidence", 0.0)
        
        # Too low confidence → escalate to LLM reasoning
        if confidence < self.LLM_ESCALATION_THRESHOLD:
            return self._outcome(
                action="ESCALATE_AGENT" if confidence >= self.IGNORE_THRESHOLD else "IGNORE",
                proposed=proposed if confidence >= self.IGNORE_THRESHOLD else None,
                reason=(
                    f"Confidence {confidence:.0%} below escalation threshold. "
                    f"{'Requesting LLM reasoning.' if confidence >= self.IGNORE_THRESHOLD else 'Event confidence too low.'}"
                ),
                conflicts=[],
                slots=[],
                raw=raw_event,
                agent_reasoning=(
                    "Low confidence event detected. Candidate for LLM-based "
                    "reasoning to determine if this warrants user attention."
                ) if confidence >= self.IGNORE_THRESHOLD else None,
                current_priority=current_priority
            )

        # ── Step 3: Run conflict detection ────────────────────────────────
        conflict_result = self.detector.check(proposed, existing_events)

        # ── Step 4a: No conflict → auto schedule ──────────────────────────
        if not conflict_result["has_conflict"]:
            return self._outcome(
                action="AUTO_SCHEDULE",
                proposed=proposed,
                reason="No conflicts detected. High confidence. Autonomously scheduling.",
                conflicts=[],
                slots=[],
                raw=raw_event,
                agent_reasoning=(
                    f"Calendar window is clear for {proposed['title']} at "
                    f"{proposed['start'].strftime('%Y-%m-%d %H:%M')}. "
                    f"Confidence: {confidence:.0%}. Auto-scheduling triggered."
                ),
                current_priority=current_priority
            )

        # ── Step 4b: Only soft conflicts (buffer) → still auto schedule
        hard = [c for c in conflict_result["conflicts"] if c["type"] == "OVERLAP"]
        soft = [c for c in conflict_result["conflicts"] if c["type"] == "BUFFER_VIOLATION"]

        if not hard and soft:
            return self._outcome(
                action="AUTO_SCHEDULE",
                proposed=proposed,
                reason=(
                    f"Minor buffer warning with '{soft[0]['with']}' "
                    f"({soft[0]['gap_minutes']} min gap). No hard conflict. "
                    f"Autonomously scheduling anyway."
                ),
                conflicts=soft,
                slots=[],
                raw=raw_event,
                agent_reasoning=(
                    f"Soft conflict (buffer violation) detected but no hard overlap. "
                    f"User configured buffer: {self.detector.buffer_minutes} min. "
                    f"Actual gap: {soft[0]['gap_minutes']} min. Proceeding with schedule."
                ),
                current_priority=current_priority
            )

        # ── Step 4c: Hard conflict priority check ─────────────────────────
        max_existing_priority = max([c.get("existing_priority", 0) for c in hard] + [0])
        preemptible_ids = [c.get("existing_id") for c in hard if c.get("existing_id") is not None]

        if current_priority > max_existing_priority:
            free_slots = []
            if hard:
                e_id = hard[0].get("existing_id")
                e_event_obj = next((e for e in existing_events if e.get("id") == e_id), None)
                if e_event_obj:
                    updated_existing = [proposed] + [e for e in existing_events if e.get("id") != e_id]
                    free_slots = self.finder.find(e_event_obj, updated_existing)

            return self._outcome(
                action="PREEMPT_EXISTING",
                proposed=proposed,
                reason=(
                    f"Event has higher priority ({current_priority}) than conflicting events "
                    f"(max priority {max_existing_priority}). Preempting existing events."
                ),
                conflicts=conflict_result["conflicts"],
                slots=free_slots,
                raw=raw_event,
                agent_reasoning=(
                    f"Direct time conflict detected, but Priority Scheduling determined "
                    f"the new event takes precedence. Existing events {preemptible_ids} will be bumped."
                ),
                current_priority=current_priority
            )

        # ── Step 4d: Hard conflict (lower/equal priority) → find alternatives 
        free_slots = self.finder.find(proposed, existing_events)

        if free_slots:
            return self._outcome(
                action="SUGGEST_SLOTS",
                proposed=proposed,
                reason=(
                    f"Hard conflict with '{hard[0]['with']}' at "
                    f"{hard[0]['existing_start']}–{hard[0]['existing_end']}. "
                    f"Found {len(free_slots)} alternative time slots."
                ),
                conflicts=conflict_result["conflicts"],
                slots=free_slots,
                raw=raw_event,
                agent_reasoning=(
                    f"Direct time conflict detected. Autonomously searched for "
                    f"alternative slots on the same day within working hours "
                    f"({self.finder.working_start}–{self.finder.working_end}). "
                    f"Presenting {len(free_slots)} options to user."
                ),
                current_priority=current_priority
            )

        # ── Step 4d: Conflict + no free slots → escalate to user ──────────
        return self._outcome(
            action="NEEDS_REVIEW",
            proposed=proposed,
            reason=(
                f"Hard conflict with '{hard[0]['with']}' and no alternative "
                f"slots available on {proposed['start'].strftime('%Y-%m-%d')}. "
                f"User decision required."
            ),
            conflicts=conflict_result["conflicts"],
            slots=[],
            raw=raw_event,
            agent_reasoning=(
                f"Unable to autonomously resolve: Hard conflict detected "
                f"and no free slots found on the requested day. Escalating to user."
            ),
            current_priority=current_priority
        )

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _parse(self, data):
        """Convert NLP output into a usable event dict."""
        try:
            # Try to parse date and time
            if not data.get('date') or not data.get('time'):
                return None
                
            start = datetime.strptime(
                f"{data['date']} {data['time']}", "%Y-%m-%d %H:%M:%S"
            )
            
            # Determine end time
            if data.get("end_time"):
                end = datetime.strptime(
                    f"{data['date']} {data['end_time']}", "%Y-%m-%d %H:%M:%S"
                )
            else:
                duration = data.get("duration", 60)
                end = start + timedelta(minutes=duration)

            return {
                "title": data.get("event_context", "Untitled Event"),
                "start": start,
                "end": end,
                "location": data.get("location", ""),
                "confidence": data.get("confidence", 1.0),
            }
        except Exception as e:
            print(f"[DecisionMaker] Parse error: {str(e)}")
            return None

    def _outcome(self, action, proposed, reason, conflicts, slots, raw, 
                 agent_reasoning=None, current_priority=0):
        """Build the final structured response with agentic metadata."""
        return {
            "action": action,
            "reason": reason,
            "agent_reasoning": agent_reasoning,  # NEW: Reasoning explanation
            "event": {
                "title": proposed["title"] if proposed else raw.get("event_context", "Unknown"),
                "start": proposed["start"].isoformat() if proposed else None,
                "end": proposed["end"].isoformat() if proposed else None,
                "location": proposed["location"] if proposed else raw.get("location", ""),
                "confidence": proposed.get("confidence", 0) if proposed else raw.get("confidence", 0),
                "priority_score": current_priority,
            },
            "conflicts": conflicts,
            "suggested_slots": [
                {
                    "start": s["start"].isoformat(),
                    "end": s["end"].isoformat(),
                    "label": s["label"]
                }
                for s in slots
            ],
            "metadata": {
                "email_id": raw.get("emailId"),
                "from_email": raw.get("fromEmail"),
                "processed_at": datetime.now().isoformat(),
            }
        }
