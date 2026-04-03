"""
priority_scheduler.py

Calculates event priority based on various factors.
Factors: Sender importance, Keyword relevance, Time urgency, User behavior (attendance history).
"""
from datetime import datetime
import re

class PriorityScheduler:
    def __init__(self, allowed_senders=None):
        self.allowed_senders = allowed_senders or []
        
        # Priority weight configs (total sums to 100)
        self.WEIGHT_SENDER = 30
        self.WEIGHT_KEYWORDS = 25
        self.WEIGHT_TIME_URGENCY = 20
        self.WEIGHT_USER_BEHAVIOR = 25
        
        # High impact keywords and their individual weights
        self.URGENT_KEYWORDS = {
            'urgent': 1.0,
            'emergency': 1.0,
            'important': 0.8,
            'deadline': 0.8,
            'interview': 0.9,
            'client': 0.8,
            'manager': 0.7,
            'sync': 0.3,
            'update': 0.3
        }

    def compute_priority(self, event_data, attendance_history=None):
        """
        Compute a priority score from 0 to 100 for a given event.
        
        Args:
            event_data (dict): Dict containing NLP parsed event fields.
            attendance_history (list): List of previous events to calculate user behavior.
            
        Returns:
            int: Priority score (0-100)
        """
        score = 0
        
        # 1. Sender Importance (0 to 30)
        sender_score = self._compute_sender_score(event_data.get('fromEmail'))
        score += sender_score
        
        # 2. Keyword Relevance (0 to 25)
        keyword_score = self._compute_keyword_score(
            event_data.get('title', '') + ' ' + event_data.get('event_context', '')
        )
        score += keyword_score
        
        # 3. Time Urgency (0 to 20)
        time_score = self._compute_time_urgency(event_data.get('start'), event_data.get('date'))
        score += time_score
        
        # 4. User Behavior (0 to 25)
        behavior_score = self._compute_user_behavior_score(event_data, attendance_history)
        score += behavior_score
        
        # Cap score between 0 and 100
        return max(0, min(100, int(score)))

    def _compute_sender_score(self, from_email):
        if not from_email:
            return 0
            
        from_email = from_email.lower()
        for allowed in self.allowed_senders:
            if isinstance(allowed, dict) and allowed.get('email', '').lower() == from_email:
                return self.WEIGHT_SENDER
            elif isinstance(allowed, str) and allowed.lower() == from_email:
                return self.WEIGHT_SENDER
                
        # If not exactly allowed, but from same domain as allowed, give partial
        domain = from_email.split('@')[-1] if '@' in from_email else ''
        for allowed in self.allowed_senders:
            allowed_email = allowed.get('email', '') if isinstance(allowed, dict) else allowed
            if f'@{domain}' in allowed_email:
                return self.WEIGHT_SENDER * 0.5
                
        return self.WEIGHT_SENDER * 0.2  # Base score for any sender

    def _compute_keyword_score(self, text):
        if not text:
            return 0
            
        text = text.lower()
        words = re.findall(r'\b\w+\b', text)
        
        relevance = 0.0
        for word in words:
            if word in self.URGENT_KEYWORDS:
                relevance += self.URGENT_KEYWORDS[word]
                
        relevance = min(1.0, relevance) # max 1.0 multiplier
        return self.WEIGHT_KEYWORDS * relevance

    def _compute_time_urgency(self, start_date_obj=None, date_str=None):
        target_date = None
        
        if start_date_obj:
            if isinstance(start_date_obj, str):
                try: 
                    target_date = datetime.fromisoformat(start_date_obj.replace('Z', '+00:00'))
                except:
                    pass
            else:
                target_date = start_date_obj
                
        if not target_date and date_str:
            try:
                target_date = datetime.strptime(date_str, "%Y-%m-%d")
            except:
                pass
                
        if not target_date:
            return self.WEIGHT_TIME_URGENCY * 0.5 # Neutral if no date
            
        # Ensure naive datetime for diff
        if target_date.tzinfo:
            target_date = target_date.replace(tzinfo=None)
            
        now = datetime.now()
        days_diff = (target_date - now).days
        
        if days_diff < 0:
            return 0 # Past events
        if days_diff <= 1:
            return self.WEIGHT_TIME_URGENCY # Next 24-48 hours
        if days_diff <= 3:
            return self.WEIGHT_TIME_URGENCY * 0.8
        if days_diff <= 7:
            return self.WEIGHT_TIME_URGENCY * 0.5
            
        return self.WEIGHT_TIME_URGENCY * 0.2

    def _compute_user_behavior_score(self, event_data, attendance_history):
        if not attendance_history:
            return self.WEIGHT_USER_BEHAVIOR * 0.5 # Neutral if no history
            
        # Try to find similar past events (by title/context or sender)
        target_title = event_data.get('title', '').lower()
        
        attended_count = 0
        not_attended_count = 0
        
        for hist_event in attendance_history:
            # We look at historical events that have attendance logged
            status = hist_event.get('attendanceStatus')
            if status not in ['attended', 'not_attended']:
                continue
                
            hist_title = hist_event.get('title', '').lower()
            
            # Simple similarity: overlaps in title
            if target_title and hist_title and self._are_titles_similar(target_title, hist_title):
                if status == 'attended':
                    attended_count += 3 # heavier weight for direct title match
                else:
                    not_attended_count += 3
                    
        total = attended_count + not_attended_count
        if total == 0:
            return self.WEIGHT_USER_BEHAVIOR * 0.5 # Default middle ground
            
        ratio = attended_count / total
        return self.WEIGHT_USER_BEHAVIOR * ratio
        
    def _are_titles_similar(self, t1, t2):
        words1 = set(re.findall(r'\b\w+\b', t1))
        words2 = set(re.findall(r'\b\w+\b', t2))
        
        if not words1 or not words2:
            return False
            
        intersection = words1.intersection(words2)
        return len(intersection) > 0
