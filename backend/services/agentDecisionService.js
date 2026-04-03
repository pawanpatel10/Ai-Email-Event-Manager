/**
 * agentDecisionService.js
 * 
 * Node.js integration layer for the Python decision engine.
 * Spawns Python processes to make autonomous scheduling decisions.
 * 
 * This bridges the Node.js API with the agentic Python decision engine.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DECISION_ENGINE_PATH = path.join(
  __dirname,
  '../app/decision_engine/agent_orchestrator.py'
);

/**
 * Execute the Python decision engine to make an autonomous decision
 * about a detected event.
 * 
 * @param {Object} nlpEvent - Event extracted by NLP module
 * @param {Array} existingEvents - User's existing calendar events
 * @param {Object} userPrefs - User scheduling preferences
 * @returns {Promise<Object>} - Decision object with action and reasoning
 */
export async function makeAgentDecision(nlpEvent, existingEvents = [], userPrefs = null) {
  return new Promise((resolve, reject) => {
    try {
      const python = spawn('python', [DECISION_ENGINE_PATH]);
      let output = '';
      let errorOutput = '';

      // Send data to Python stdin
      python.stdin.write(
        JSON.stringify({
          nlp_event: nlpEvent,
          existing_events: existingEvents,
          user_prefs: userPrefs,
        })
      );
      python.stdin.end();

      // Capture stdout
      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Capture stderr
      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Handle completion
      python.on('close', (code) => {
        if (code !== 0) {
          console.error('[Agent Decision Error]', errorOutput);
          return reject(new Error(`Decision engine failed: ${errorOutput}`));
        }

        try {
          const decision = JSON.parse(output);
          resolve(decision);
        } catch (parseError) {
          reject(new Error(`Failed to parse decision engine output: ${parseError.message}`));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Process a batch of emails and generate decisions for each.
 * 
 * @param {Array} emailEvents - Array of NLP-extracted events
 * @param {Array} existingEvents - User's calendar events
 * @param {Object} userPrefs - User preferences
 * @returns {Promise<Object>} - Batch result with prioritized decisions
 */
export async function batchProcessDecisions(emailEvents, existingEvents = [], userPrefs = null) {
  const decisions = [];

  for (const event of emailEvents) {
    try {
      const decision = await makeAgentDecision(event, existingEvents, userPrefs);
      decisions.push(decision);
    } catch (error) {
      console.error(`[Agent] Failed to process event from email:`, event, error);
      decisions.push({
        action: 'ERROR',
        event: event,
        reason: error.message,
      });
    }
  }

  // Prioritize decisions
  const priorityMap = {
    'AUTO_SCHEDULE': 0,
    'SUGGEST_SLOTS': 1,
    'NEEDS_REVIEW': 2,
    'ESCALATE_AGENT': 3,
    'IGNORE': 4,
    'ERROR': 5,
  };

  decisions.sort((a, b) => {
    const priorityA = priorityMap[a.action] ?? 99;
    const priorityB = priorityMap[b.action] ?? 99;
    return priorityA - priorityB;
  });

  return {
    total_processed: emailEvents.length,
    auto_schedule_count: decisions.filter(d => d.action === 'AUTO_SCHEDULE').length,
    needs_user_input: decisions.filter(d => ['SUGGEST_SLOTS', 'NEEDS_REVIEW'].includes(d.action)).length,
    decisions,
  };
}

/**
 * Convert existing database events to the format needed by the decision engine.
 * 
 * @param {Array} mongoEvents - Events from MongoDB
 * @returns {Array} - Formatted events for decision engine
 */
export function formatExistingEventsForAgent(mongoEvents) {
  return mongoEvents.map(event => ({
    id: event._id.toString(),
    title: event.title,
    start: new Date(event.dateTime),
    end: event.endDateTime 
      ? new Date(event.endDateTime)
      : new Date(new Date(event.dateTime).getTime() + (event.duration || 60) * 60000),
    duration: event.duration || 60,
    priorityScore: event.priorityScore || 0,
  }));
}

/**
 * Log user feedback for preference learning.
 * This helps the agent improve over time.
 * 
 * @param {string} decisionId - ID of the decision
 * @param {string} userChoice - What the user chose
 * @param {Object} context - Additional context
 */
export async function logUserFeedback(decisionId, userChoice, context = null) {
  // TODO: Persist feedback to database for learning
  console.log(`[Agent Feedback] Decision ${decisionId}: User chose "${userChoice}"`, context);
  
  return {
    status: 'feedback_logged',
    decision_id: decisionId,
    user_choice: userChoice,
  };
}

/**
 * Get agent performance metrics
 * 
 * @returns {Promise<Object>} - Agent statistics
 */
export async function getAgentMetrics() {
  // TODO: Query database for metrics
  return {
    total_decisions: 0,
    auto_scheduled: 0,
    suggested_alternatives: 0,
    user_escalations: 0,
    accuracy_rate: 0,
  };
}
