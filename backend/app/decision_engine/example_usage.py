"""
example_usage.py
Quick examples of how to use the agentic decision engine
"""

from datetime import datetime, timedelta
from app.decision_engine import DecisionMaker, AgentOrchestrator

# ============================================================================
# Example 1: Simple autonomous decision
# ============================================================================

print("=" * 70)
print("EXAMPLE 1: Autonomous Scheduling Decision")
print("=" * 70)

# This is what the NLP module would extract from an email
nlp_event = {
    "title": "Team Meeting",
    "date": "2024-04-15",
    "time": "10:00:00",
    "duration": 60,
    "location": "Conference Room A",
    "event_context": "Team sync meeting",
    "confidence": 0.92,  # High confidence
    "emailId": "abc123",
    "fromEmail": "boss@company.com",
}

# Existing events on the calendar
existing_events = [
    {
        "title": "Standup",
        "start": datetime(2024, 4, 15, 9, 0),
        "end": datetime(2024, 4, 15, 9, 30),
    },
    {
        "title": "Code Review",
        "start": datetime(2024, 4, 15, 11, 30),
        "end": datetime(2024, 4, 15, 12, 30),
    },
]

# Make the decision
maker = DecisionMaker()
decision = maker.decide(nlp_event, existing_events)

print(f"\nDecision: {decision['action']}")
print(f"Reason: {decision['reason']}")
print(f"Agent Reasoning: {decision['agent_reasoning']}")
print(f"Event: {decision['event']['title']} at {decision['event']['start']}")
print(f"Conflicts: {decision['conflicts']}")

# Output:
# Decision: AUTO_SCHEDULE
# Reason: No conflicts detected. High confidence. Autonomously scheduling.
# Agent Reasoning: Calendar window is clear for Team Meeting at 2024-04-15 10:00:00. Confidence: 92%. Auto-scheduling triggered.
# Event: Team Meeting at 2024-04-15T10:00:00
# Conflicts: []


# ============================================================================
# Example 2: Conflict detection with alternatives
# ============================================================================

print("\n" + "=" * 70)
print("EXAMPLE 2: Conflict Detection with Slot Suggestions")
print("=" * 70)

nlp_event_2 = {
    "title": "Client Call",
    "date": "2024-04-15",
    "time": "10:00:00",  # Conflicts with Team Meeting!
    "duration": 45,
    "location": "Zoom",
    "event_context": "Client Zoom call",
    "confidence": 0.88,
    "emailId": "def456",
    "fromEmail": "client@external.com",
}

decision_2 = maker.decide(nlp_event_2, existing_events)

print(f"\nDecision: {decision_2['action']}")
print(f"Reason: {decision_2['reason']}")
print(f"Conflicts: {len(decision_2['conflicts'])} conflict(s) detected")
for conflict in decision_2['conflicts']:
    print(f"  - {conflict['message']}")

print(f"\nSuggested Alternatives:")
for i, slot in enumerate(decision_2['suggested_slots'], 1):
    print(f"  {i}. {slot['label']}")

# Output example:
# Decision: SUGGEST_SLOTS
# Reason: Hard conflict with 'Team Meeting' at 10:00–11:00. Found 3 alternative time slots.
# Conflicts: 1 conflict(s) detected
#   - Clashes with 'Team Meeting' (10:00–11:00) — 60 min overlap.
# Suggested Alternatives:
#   1. 09:30–10:15
#   2. 11:00–11:45
#   3. 14:00–14:45


# ============================================================================
# Example 3: Low confidence event (escalates to LLM)
# ============================================================================

print("\n" + "=" * 70)
print("EXAMPLE 3: Low Confidence Event (Needs Review)")
print("=" * 70)

nlp_event_3 = {
    "title": "maybe a meeting?",  # Unclear
    "date": "2024-04-16",
    "time": "15:00:00",
    "duration": 30,
    "location": "",
    "event_context": "something about meeting tomorrow afternoon",
    "confidence": 0.45,  # Low confidence!
    "emailId": "ghi789",
    "fromEmail": "unclear@example.com",
}

decision_3 = maker.decide(nlp_event_3, [])

print(f"\nDecision: {decision_3['action']}")
print(f"Reason: {decision_3['reason']}")
print(f"Agent Reasoning: {decision_3['agent_reasoning']}")

# Output:
# Decision: ESCALATE_AGENT
# Reason: Confidence 45% below escalation threshold. Requesting LLM reasoning.
# Agent Reasoning: Low confidence event detected. Candidate for LLM-based reasoning to determine if this warrants user attention.


# ============================================================================
# Example 4: Batch processing emails
# ============================================================================

print("\n" + "=" * 70)
print("EXAMPLE 4: Batch Process Multiple Emails")
print("=" * 70)

emails = [nlp_event, nlp_event_2, nlp_event_3]

orchestrator = AgentOrchestrator()
batch_result = orchestrator.batch_process_emails(emails, existing_events)

print(f"\nBatch Results:")
print(f"Total Processed: {batch_result['total_processed']}")
print(f"Auto-Scheduled: {batch_result['auto_schedule_count']}")
print(f"Needs User Input: {batch_result['needs_user_input']}")

print(f"\nDecisions (by priority):")
for decision in batch_result['decisions']:
    print(f"  - {decision['event']['title']}: {decision['action']}")

# Output:
# Batch Results:
# Total Processed: 3
# Auto-Scheduled: 1
# Needs User Input: 1
# 
# Decisions (by priority):
#   - Team Meeting: AUTO_SCHEDULE
#   - Client Call: SUGGEST_SLOTS
#   - maybe a meeting?: ESCALATE_AGENT


# ============================================================================
# Example 5: Integration with user preferences
# ============================================================================

print("\n" + "=" * 70)
print("EXAMPLE 5: Custom Preferences")
print("=" * 70)

user_prefs = {
    "buffer_minutes": 30,  # More buffer time between events
    "auto_schedule_threshold": 0.90,  # Only auto-schedule if 90%+ confident
    "working_hours": {
        "start": "08:00",
        "end": "18:00",
    }
}

maker_with_prefs = DecisionMaker(
    buffer_minutes=30,
    user_preferences=user_prefs
)

decision_5 = maker_with_prefs.decide(nlp_event, existing_events)

print(f"\nWith enhanced preferences:")
print(f"Decision: {decision_5['action']}")
print(f"Buffer requirement: 30 minutes (vs default 15)")
print(f"Auto-schedule threshold: 90% (vs default 85%)")

# The decision might change based on preferences
# (e.g., what was AUTO_SCHEDULE before might now be NEEDS_REVIEW
#  if the buffer is too tight)


# ============================================================================
# Example 6: User feedback loop
# ============================================================================

print("\n" + "=" * 70)
print("EXAMPLE 6: Learning from User Feedback")
print("=" * 70)

# When user modifies or rejects a suggestion:
feedback = orchestrator.learn_from_user_decision(
    decision_id="evt_abc123",
    user_choice="user_rescheduled_to_2pm",
    outcome_data={
        "original_suggestion": "10:00 AM",
        "user_selected": "2:00 PM",
        "reason": "preferred afternoon",
    }
)

print(f"\nFeedback recorded:")
print(f"Status: {feedback['status']}")
print(f"Decision ID: {feedback['decision_id']}")
print(f"User Choice: {feedback['user_choice']}")
print("\nThis data will be used to:")
print("  - Learn user time preferences")  
print("  - Adjust confidence thresholds")
print("  - Improve future suggestions")


# ============================================================================
# Running These Examples
# ============================================================================

"""
To run this file:

1. Activate your Python environment:
   source .venv/bin/activate  # or .venv\Scripts\Activate on Windows

2. Run the examples:
   python backend/app/decision_engine/example_usage.py

3. Review the output to understand how the agent makes decisions

4. Integrate into your Node.js code:
   import agentDecisionService from './services/agentDecisionService.js';
   const decision = await agentDecisionService.makeAgentDecision(nlpEvent, events);
"""
