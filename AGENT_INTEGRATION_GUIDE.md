/**
 * INTEGRATION GUIDE - How to connect the agentic decision engine
 * to your existing Event Controller
 * 
 * This shows the minimal changes needed to activate low-level agenticty.
 */

// ============================================================================
// STEP 1: Update eventController.js
// ============================================================================

// ADD these imports at the top:
import {
  makeAgentDecision,
  formatExistingEventsForAgent,
  logUserFeedback,
  batchProcessDecisions,
} from "../services/agentDecisionService.js";

// ============================================================================
// STEP 2: Modify the event creation logic (example)
// ============================================================================

/**
 * BEFORE (current flow):
 * 
 * Email → NLP → Create Event → Pending/Confirmed → Done
 * 
 * 
 * AFTER (with agentic decision):
 * 
 * Email → NLP → Agent Decision → AUTO/SUGGEST/NEEDS_REVIEW → Action
 */

// Example of how to integrate into event creation endpoint:
// 
// router.post('/events/create-from-email', asyncHandler(async (req, res) => {
//   const { nlpExtractedEvent, userId } = req.body;
//   
//   const user = await User.findById(userId);
//   const userPreferences = user.preferences || {};
//   const existingEvents = await Event.find({
//     userId,
//     status: { $in: ['confirmed', 'scheduled'] }
//   });
//   
//   // ──────────────────────────────────────────────────────────
//   // AGENTIC DECISION: Let the agent decide what to do
//   // ──────────────────────────────────────────────────────────
//   const decision = await makeAgentDecision(
//     nlpExtractedEvent,
//     formatExistingEventsForAgent(existingEvents),
//     userPreferences
//   );
//   
//   // Handle each decision type
//   switch (decision.action) {
//     
//     case 'AUTO_SCHEDULE':
//       // The agent decided to autonomously schedule this event
//       const autoEvent = await Event.create({
//         userId,
//         title: decision.event.title,
//         dateTime: new Date(decision.event.start),
//         endDateTime: new Date(decision.event.end),
//         location: decision.event.location,
//         status: 'scheduled', // Direct to scheduled (no pending)
//         confidence: decision.event.confidence,
//         agentDecision: decision, // Store agent reasoning
//         requiresUserConfirmation: false,
//         userConfirmed: true,
//         confirmedAt: new Date(),
//       });
//       
//       // Optionally sync to Google Calendar immediately
//       if (user.googleAccessToken) {
//         await syncEventToGoogleCalendar(autoEvent, user);
//       }
//       
//       return res.status(201).json({
//         message: 'Event autonomously scheduled by agent',
//         event: autoEvent,
//         decision_reasoning: decision.agent_reasoning,
//       });
//     
//     
//     case 'SUGGEST_SLOTS':
//       // The agent found conflicts but located alternatives
//       const suggestEvent = await Event.create({
//         userId,
//         title: decision.event.title,
//         dateTime: new Date(decision.event.start),
//         endDateTime: new Date(decision.event.end),
//         location: decision.event.location,
//         status: 'pending', // Keep pending for user choice
//         confidence: decision.event.confidence,
//         agentDecision: decision,
//         suggestedAlternatives: decision.suggested_slots,
//         requiresUserConfirmation: true,
//         conflictingEvents: decision.conflicts,
//       });
//       
//       return res.status(201).json({
//         message: 'Conflict detected. Presenting alternatives.',
//         event: suggestEvent,
//         alternatives: decision.suggested_slots,
//         reason: decision.reason,
//       });
//     
//     
//     case 'NEEDS_REVIEW':
//       // Agent cannot decide - needs human judgment
//       const reviewEvent = await Event.create({
//         userId,
//         title: decision.event.title,
//         dateTime: new Date(decision.event.start),
//         endDateTime: new Date(decision.event.end),
//         location: decision.event.location,
//         status: 'pending',
//         confidence: decision.event.confidence,
//         agentDecision: decision,
//         requiresUserConfirmation: true,
//       });
//       
//       return res.status(201).json({
//         message: 'Agent needs your review before scheduling.',
//         event: reviewEvent,
//         reason: decision.reason,
//         agent_reasoning: decision.agent_reasoning,
//       });
//     
//     
//     case 'ESCALATE_AGENT':
//       // Low confidence - LLM reasoning recommended
//       // TODO: Integrate with Claude/GPT for reasoning
//       const escalateEvent = await Event.create({
//         userId,
//         title: decision.event.title,
//         dateTime: new Date(decision.event.start),
//         location: decision.event.location,
//         status: 'pending',
//         confidence: decision.event.confidence,
//         agentDecision: decision,
//         requiresLLMReview: true,
//         requiresUserConfirmation: true,
//       });
//       
//       return res.status(201).json({
//         message: 'Event flagged for LLM reasoning review.',
//         event: escalateEvent,
//         reason: decision.reason,
//       });
//     
//     
//     case 'IGNORE':
//       // Confidence too low - silently ignore
//       return res.status(202).json({
//         message: 'Event ignored - confidence below threshold.',
//         confidence: decision.event.confidence,
//         reason: decision.reason,
//       });
//     
//     default:
//       return res.status(500).json({ error: 'Unknown agent action' });
//   }
// }));

// ============================================================================
// STEP 3: Add feedback endpoint to learn from user decisions
// ============================================================================

// router.post('/events/:eventId/user-feedback', asyncHandler(async (req, res) => {
//   const { eventId } = req.params;
//   const { userAction, selectedAlternative } = req.body;
//   
//   const event = await Event.findById(eventId);
//   
//   // Log what the user did vs what agent suggested
//   if (event.agentDecision) {
//     await logUserFeedback(
//       eventId,
//       userAction, // 'accepted', 'modified', 'rejected', etc
//       {
//         agent_suggested_time: event.dateTime,
//         user_selected_time: selectedAlternative,
//         confidence: event.confidence,
//         agent_reasoning: event.agentDecision.agent_reasoning,
//       }
//     );
//     
//     // Update event based on user choice
//     if (selectedAlternative) {
//       event.dateTime = new Date(selectedAlternative);
//     }
//     if (userAction === 'accepted') {
//       event.status = 'confirmed';
//       event.userConfirmed = true;
//       event.confirmedAt = new Date();
//     }
//     
//     await event.save();
//   }
//   
//   return res.json({
//     message: 'Feedback recorded. Agent will learn from this.',
//     event,
//   });
// }));

// ============================================================================
// STEP 4: Update Event Schema to store agent decisions
// ============================================================================

// In models/Event.js, add these fields:
// 
// agentDecision: {
//   type: Object, // Store full decision object
//   default: null,
// },
// 
// suggestedAlternatives: [{
//   start: Date,
//   end: Date,
//   label: String,
// }],
// 
// requiresLLMReview: {
//   type: Boolean,
//   default: false,
// },
// 
// agentAccuracy: {
//   type: String,
//   enum: ['correct', 'corrected_by_user', 'rejected', 'unknown'],
//   default: 'unknown',
// },

// ============================================================================
// SUMMARY
// ============================================================================

/*
With these changes, your project becomes AGENTIC at the low level:

✅ Autonomous Decisions: Agent decides AUTO_SCHEDULE, SUGGEST_SLOTS, NEEDS_REVIEW
✅ Conflict Detection: Hard conflicts (overlap) vs soft (buffer)
✅ Alternative Generation: Finds free time when conflicts exist
✅ Confidence-Based: Acts only when confidence is high enough
✅ Feedback Loop: Captures user decisions for learning
✅ Extensible: Ready for LLM reasoning, preference learning, etc.

To make it EVEN MORE agentic:

1. Add Claude/GPT integration (ESCALATE_AGENT → LLM reasoning)
2. Implement preference learning (adapt thresholds per user)
3. Add task planning (handle recurring events, complex requests)
4. Expand tools (Slack notifications, Zoom links, etc.)
5. Build feedback loop (improve from user corrections)

See AGENTIC_ROADMAP.md for detailed enhancement suggestions.
*/
