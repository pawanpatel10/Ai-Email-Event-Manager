"""
Decision Engine Package

Agentic decision-making system for the Email Event Manager.
Handles conflict detection, slot finding, and autonomous scheduling decisions.

Modules:
- conflict_detector: Detects calendar conflicts (hard and soft)
- slot_finder: Finds alternative time slots when conflicts occur
- decision_maker: Makes autonomous decisions based on confidence and conflicts
- agent_orchestrator: Orchestrates the complete workflow (low-level agentic engine)
"""

from .decision_maker import DecisionMaker
from .conflict_detector import ConflictDetector
from .slot_finder import SlotFinder
from .agent_orchestrator import AgentOrchestrator

__all__ = [
    'DecisionMaker',
    'ConflictDetector',
    'SlotFinder',
    'AgentOrchestrator',
]
