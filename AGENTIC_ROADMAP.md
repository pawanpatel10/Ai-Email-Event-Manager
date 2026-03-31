# Agentic Event Manager - Implementation Guide

## ✅ Current Agentic Capabilities (Low-Level)

The decision engine now provides these autonomous features:

### 1. **Autonomous Scheduling** 
- Auto-schedules events when confidence > 85% and no conflicts exist
- Makes independent decisions without user intervention

### 2. **Intelligent Conflict Resolution**
- Detects hard conflicts (overlapping times)
- Detects soft conflicts (buffer violations)
- Distinguishes between actionable and ignorable conflicts

### 3. **Alternative Generation**
- Autonomously searches for free time slots when conflicts occur
- Presents top 3 alternatives sorted by availability

### 4. **Risk-Based Decision Making**
- Escalates low-confidence events (30-85% confidence) to LLM reasoning
- Ignores very low-confidence events (< 30%)
- Provides reasoning explanations for all decisions

### 5. **Preference Learning Hooks**
- Captures user feedback for future learning
- `logUserFeedback()` placeholder for training the agent

---

## 🚀 Suggested Enhancements to Make It Truly Agentic

### **Phase 1: LLM Integration (Next Priority)**

Add Claude/GPT reasoning for complex scenarios:

```python
# decision_maker.py enhancement
from anthropic import Anthropic

class DecisionMaker:
    def __init__(self, llm_client=None):
        self.llm = llm_client  # Claude or GPT
    
    def escalate_to_llm(self, event, context):
        """Ask LLM to reason about edge cases"""
        prompt = f"""
        The event scheduling system detected a low-confidence event.
        Event: {event['title']} at {event['start']}
        Confidence: {event['confidence']}
        
        Context: {json.dumps(context)}
        
        Should this be:
        1. Auto-scheduled
        2. Shown as suggestion
        3. Escalated to user
        
        Explain your reasoning.
        """
        
        response = self.llm.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text
```

**Where to integrate:**
- `decision_maker.py` lines 58-67 (ESCALATE_AGENT action)
- Create `agent_orchestrator.py` → `escalate_to_llm()` method

---

### **Phase 2: User Preference Learning**

Make the agent adapt to individual user patterns:

```python
# New: preference_learner.py
class PreferenceLearner:
    """
    Learns from user decisions to improve autonomy over time.
    """
    
    def analyze_pattern(self, user_decisions):
        """
        Patterns to detect:
        - Time preferences (always schedules meetings 9-11 AM)
        - Buffer preferences (tight schedule → smaller buffer)
        - Auto-reject patterns (always rejects emails from certain senders)
        - Conflict resolution (always picks first alternative)
        """
        pass
    
    def update_thresholds(self):
        """Adapt AUTO_SCHEDULE_THRESHOLD based on success rate"""
        # If user rejects many auto-scheduled events → lower threshold
        # If user always accepts → raise threshold
        pass
```

---

### **Phase 3: Multi-Step Task Breakdown**

Handle complex requests as multi-step workflows:

```python
# New: task_planner.py
class TaskPlanner:
    """
    For requests like "Schedule me for coffee on Tuesdays for the next month"
    Break into:
    1. Identify all required Tuesdays
    2. Find free slots each Tuesday
    3. Create recurring vs individual events
    4. Handle recurring conflicts
    """
    
    def plan_recurring_event(self, rule_description):
        """Parse natural language like 'every Tuesday at 10am'"""
        pass
    
    def handle_complex_request(self, email_text):
        """Detect and handle multi-step bookings"""
        pass
```

---

### **Phase 4: Tool Orchestration**

Expand beyond email/calendar to other services:

```python
# New: tool_manager.py
class ToolManager:
    """
    Autonomous tool selection based on task needs.
    Current tools: Gmail, Google Calendar
    
    Future tools:
    - Slack (notify attendees)
    - Zoom API (create meeting links)
    - Weather API (reschedule outdoor events)
    - Flight APIs (adjust for travel)
    """
    
    def select_tools(self, event_context):
        """Autonomously choose which tools to invoke"""
        tools = []
        
        if event_context.get('requires_meeting_link'):
            tools.append('zoom_api')
        if event_context.get('needs_notifications'):
            tools.append('slack')
        
        return tools
    
    def execute_tools(self, tools, event_data):
        """Execute selected tools in sequence"""
        pass
```

---

### **Phase 5: Feedback Loop & Continuous Improvement**

Create a learning cycle:

```python
# New: feedback_processor.py
class FeedbackProcessor:
    """
    When user rejects/modifies suggested events, learn from it.
    """
    
    def on_user_rejection(self, decision_id, original_decision, user_action):
        """
        What the agent predicted: AUTO_SCHEDULE
        What user did: Manual reschedule to 2:00 PM
        
        Learning: High confidence in 9 AM slots was wrong for this user
        """
        pass
    
    def on_user_confirmation(self, decision_id):
        """Reinforce successful auto-scheduled events"""
        pass
    
    def calculate_agent_accuracy(self):
        """Track agent success rate over time"""
        pass
```

---

## 📊 Integration Roadmap

```
Current State:
┌─────────────────────────────────────────┐
│  Email → NLP → Decision Engine          │
│  (Rule-based, no learning)              │
└─────────────────────────────────────────┘

Phase 1 (LLM):
┌──────────────────────────────────────────────────┐
│  Email → NLP → Decision Engine → LLM Reasoning   │
│  (Handles edge cases, explains decisions)        │
└──────────────────────────────────────────────────┘

Phase 2 (Learning):
┌────────────────────────────────────────────────────────┐
│  Email → NLP → Decision Engine → LLM Reasoning         │
│          ↑                                        ↓     │
│          └────── Preference Learner ←────────────┘     │
│  (Adapts thresholds based on user behavior)            │
└────────────────────────────────────────────────────────┘

Phase 3-5 (Full Agent):
┌──────────────────────────────────────────────────────────────┐
│  Email → NLP → Decision Engine → LLM Reasoning               │
│          ↑                              ↓                    │
│    Preference Learner ←       Task Planner        → Tools    │
│          ↓                              ↓                    │
│    Feedback Processor ←────────────────────────────→ User    │
│  (Autonomous, learning, multi-step, tool-orchestrating)     │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔧 Immediate Next Steps

1. **Install dependencies:**
   ```bash
   pip install anthropic
   npm install child-process-promise
   ```

2. **Add LLM integration to `decision_maker.py`:**
   - Uncomment/implement `escalate_to_llm()` when action = "ESCALATE_AGENT"

3. **Connect agent to eventController:**
   ```javascript
   import { makeAgentDecision } from '../services/agentDecisionService.js';
   
   // In event creation handler:
   const decision = await makeAgentDecision(nlpEvent, existingEvents, userPrefs);
   
   switch(decision.action) {
     case 'AUTO_SCHEDULE': createEvent(event); break;
     case 'SUGGEST_SLOTS': presentAlternatives(decision.suggested_slots); break;
     case 'ESCALATE_AGENT': askLLMtoReason(decision); break;
     case 'NEEDS_REVIEW': askUserToConfirm(decision); break;
   }
   ```

4. **Add feedback collection:**
   - Create endpoint: `POST /api/events/:id/feedback`
   - Log user actions for learning

5. **Monitor agent accuracy:**
   - Track: auto-scheduled vs rejected
   - Track: suggested slots vs user-selected alternatives
   - Adjust thresholds monthly

---

## 📚 Files to Create Next

```
backend/
├── app/
│   ├── decision_engine/
│   │   ├── conflict_detector.py        ✅ Created
│   │   ├── slot_finder.py              ✅ Created
│   │   ├── decision_maker.py           ✅ Created (with LLM hooks)
│   │   ├── agent_orchestrator.py       ✅ Created
│   │   ├── llm_reasoning.py            📝 TODO (Claude integration)
│   │   ├── preference_learner.py       📝 TODO
│   │   ├── task_planner.py             📝 TODO
│   │   ├── tool_manager.py             📝 TODO
│   │   └── feedback_processor.py        📝 TODO
│   └── ...
├── controllers/
│   └── eventController.js              📝 TODO (integrate agent decisions)
├── services/
│   ├── agentDecisionService.js         ✅ Created
│   ├── agentFeedbackService.js         📝 TODO
│   └── agentMetricsService.js          📝 TODO
└── ...

tests/
├── unit/
│   ├── conflict_detector.test.py       📝 TODO
│   ├── decision_maker.test.py          📝 TODO
│   └── agent_orchestrator.test.py      📝 TODO
└── integration/
    └── agent_e2e.test.js               📝 TODO
```

---

## 🎯 Success Metrics

Track these to measure agentiability:

- **Autonomy Score:** % of events auto-scheduled without user confirmation
- **Accuracy Rate:** % of auto-scheduled events user doesn't modify
- **User Satisfaction:** Manual rejection rate trends downward
- **Task Completion:** Agent handles recurring/complex bookings without user input
- **Tool Diversity:** Agent uses multiple tools autonomously
- **Learning:** Thresholds adapt based on user patterns

---

## 🔐 Safety Considerations

As the agent becomes more autonomous:

1. **Always require explicit confirmation for:**
   - Rescheduling user's existing events
   - Sending responses on behalf of user

2. **Add override mechanisms:**
   - "Weekly adjustment" to disable agent until user review
   - "Dry-run mode" to show decisions without executing

3. **Audit trail:**
   - Log all agent decisions
   - Show reasoning for each action
   - Allow user to understand why agent acted

4. **Rate limiting:**
   - Prevent agent from creating spam events
   - Require user review after 5 consecutive auto-schedules

---

## 📖 References

- Claude API: https://docs.anthropic.com
- Node.js child_process: https://nodejs.org/api/child_process.html
- Event scheduling patterns: https://en.wikipedia.org/wiki/Event_scheduling
- Agent design patterns: https://docs.anthropic.com/en/docs/build-a-system
