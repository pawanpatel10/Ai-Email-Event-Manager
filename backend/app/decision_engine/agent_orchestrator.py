"""
agent_orchestrator.py
Decision Engine - Agent Orchestrator

Integrates the complete decision engine with the email processing pipeline.
Acts as the bridge between Python (NLP/decision logic) and Node.js (API/DB).

This is the low-level agentic entry point that orchestrates:
1. Email → NLP extraction
2. Event parsing
3. Calendar conflict analysis
4. Autonomous decision-making
5. Alternative slot suggestion
"""

from datetime import datetime
from decision_maker import DecisionMaker
import json


class AgentOrchestrator:
    """
    Low-level agentic orchestrator that manages the complete
    event detection and decision workflow.
    """

    def __init__(self, user_preferences=None):
        """
        Initialize the orchestrator.
        
        Args:
            user_preferences: User's scheduling preferences and constraints
        """
        self.decision_maker = DecisionMaker(user_preferences=user_preferences)
        self.user_preferences = user_preferences or {}

    def process_event_decision(self, nlp_output, existing_calendar_events, 
                               user_data=None):
        """
        Main orchestration method - processes a detected event through
        the entire decision pipeline.

        Args:
            nlp_output: dict from NLP module with event candidate data
            existing_calendar_events: list of existing events (for conflict checking)
            user_data: User info for preference learning

        Returns:
            decision dict ready for Node.js controller to handle
        """

        # Validate input
        if not nlp_output or not isinstance(nlp_output, dict):
            return self._error_response("Invalid NLP output")

        # Make the autonomous decision
        decision = self.decision_maker.decide(
            raw_event=nlp_output,
            existing_events=existing_calendar_events,
            user_data=user_data
        )

        return decision

    def batch_process_emails(self, email_events, existing_calendar_events, 
                             user_data=None):
        """
        Process multiple emails and generate decisions for each.
        Useful for email processing batches.

        Args:
            email_events: list of NLP-extracted event candidates
            existing_calendar_events: list of existing calendar events
            user_data: User info

        Returns:
            list of decisions with prioritization
        """
        decisions = []

        for event_candidate in email_events:
            decision = self.process_event_decision(
                event_candidate,
                existing_calendar_events,
                user_data
            )
            decisions.append(decision)

        # Sort by priority: AUTO_SCHEDULE → SUGGEST_SLOTS → NEEDS_REVIEW → ESCALATE_AGENT → IGNORE
        priority_order = {
            "AUTO_SCHEDULE": 0,
            "SUGGEST_SLOTS": 1,
            "NEEDS_REVIEW": 2,
            "ESCALATE_AGENT": 3,
            "IGNORE": 4,
        }

        decisions.sort(
            key=lambda d: priority_order.get(d["action"], 99)
        )

        return {
            "total_processed": len(email_events),
            "auto_schedule_count": sum(1 for d in decisions if d["action"] == "AUTO_SCHEDULE"),
            "needs_user_input": sum(1 for d in decisions if d["action"] in ["SUGGEST_SLOTS", "NEEDS_REVIEW"]),
            "decisions": decisions
        }

    def learn_from_user_decision(self, decision_id, user_choice, outcome_data=None):
        """
        Update decision thresholds based on user feedback.
        Forms the basis of preference learning.

        Args:
            decision_id: ID of the original decision
            user_choice: What the user chose (schedules event, picks slot, rejects, etc)
            outcome_data: Additional context (e.g., if user changed suggested time)

        Returns:
            updated preferences dict
        """
        # This is a hook for future LLM-based preference learning
        # For now, return current preferences as placeholder
        return {
            "status": "feedback_logged",
            "decision_id": decision_id,
            "user_choice": user_choice,
            "next_update": "triggered",
            "preferences": self.user_preferences
        }

    def _error_response(self, message):
        """Generate error response in standard format."""
        return {
            "action": "ERROR",
            "reason": message,
            "event": None,
            "conflicts": [],
            "suggested_slots": [],
            "metadata": {
                "processed_at": datetime.now().isoformat(),
            }
        }


# Convenience function for Node.js integration
def process_event(nlp_event_dict, calendar_events_list, user_prefs=None):
    """
    Simple entry point for Node.js to call.
    
    Usage in Node.js:
        const result = spawn('python', [
            'path/to/agent_orchestrator.py',
            JSON.stringify(nlpEvent),
            JSON.stringify(calendarEvents),
            JSON.stringify(userPreferences)
        ]);
    """
    orchestrator = AgentOrchestrator(user_preferences=user_prefs)
    return orchestrator.process_event_decision(
        nlp_event_dict,
        calendar_events_list,
        user_prefs
    )
