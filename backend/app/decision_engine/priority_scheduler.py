"""
priority_scheduler.py

Calculates event priority based on various factors.
Factors: Sender importance, Keyword relevance, Time urgency, User behavior (attendance history).
"""
from datetime import datetime
import re

class PriorityScheduler:
    def __init__(self, allowed_senders=None, sender_pattern=None, keyword_pattern=None):
        self.allowed_senders = allowed_senders or []
        self.sender_pattern = sender_pattern or {}
        self.keyword_pattern = keyword_pattern or {}
        
        # Priority weight configs (total sums to 100)
        self.WEIGHT_SENDER = 20
        self.WEIGHT_KEYWORDS = 20
        self.WEIGHT_TIME_URGENCY = 20
        self.WEIGHT_USER_BEHAVIOR = 20
        self.WEIGHT_CONFIDENCE = 20
        
        # High impact keywords and their individual weights
        self.URGENT_KEYWORDS = {
            'urgent': 1.0,
            'emergency': 1.0,
            'critical': 1.0,
            'blocker': 1.0,
            'incident': 1.0,
            'outage': 1.0,
            'asap': 0.9,
            'interview': 0.9,
            'important': 0.8,
            'deadline': 0.8,
            'client': 0.8,
            'investor': 0.9,
            'board': 0.8,
            'quarterly': 0.7,
            'q1': 0.7,
            'q2': 0.7,
            'q3': 0.7,
            'q4': 0.7,
            'manager': 0.7,
            'kickoff': 0.6,
            'sprint': 0.6,
            'planning': 0.5,
            'standup': 0.5,
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
        
        # 1. Sender Importance (0 to 20)
        sender_score = self._compute_sender_score(event_data.get('fromEmail'))
        score += sender_score
        
        # 2. Keyword Relevance (0 to 20)
        keyword_score = self._compute_keyword_score(
            event_data.get('title', '') + ' ' + event_data.get('event_context', '')
        )
        score += keyword_score
        
        # 3. Time Urgency (0 to 20)
        time_score = self._compute_time_urgency(event_data.get('start'), event_data.get('date'))
        score += time_score
        
        # 4. User Behavior (0 to 20)
        behavior_score = self._compute_user_behavior_score(event_data, attendance_history)
        score += behavior_score

        # 5. Confidence Score (0 to 20)
        confidence = event_data.get('confidence', 0.5)
        confidence_score = self.WEIGHT_CONFIDENCE * min(1.0, max(0.0, float(confidence)))
        score += confidence_score
        
        # Cap score between 0 and 100
        return max(0, min(100, int(score)))

    def _compute_sender_score(self, from_email):
        if not from_email:
            return 0
            
        from_email = from_email.lower()
        
        # Check database historical pattern analysis (Sender Confirmation Rate)
        # If we have historical data for this sender, it directly scales the weight
        if self.sender_pattern and from_email in self.sender_pattern:
            return self.WEIGHT_SENDER * self.sender_pattern[from_email]
            
        # Check exact whitelist
        for allowed in self.allowed_senders:
            if isinstance(allowed, dict) and allowed.get('email', '').lower() == from_email:
                return self.WEIGHT_SENDER
            elif isinstance(allowed, str) and allowed.lower() == from_email:
                return self.WEIGHT_SENDER
                
        # Check domain whitelist match
        domain = from_email.split('@')[-1] if '@' in from_email else ''
        for allowed in self.allowed_senders:
            allowed_email = allowed.get('email', '') if isinstance(allowed, dict) else allowed
            if f'@{domain}' in allowed_email.lower():
                return self.WEIGHT_SENDER * 0.8  # Strong domain match
                
        # Public domains penalty (unrecognized public domains get lower score)
        public_domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'mail.ru', 'icloud.com']
        if domain in public_domains:
            return self.WEIGHT_SENDER * 0.2
            
        # Unrecognized custom/corporate domains get a moderate score
        return self.WEIGHT_SENDER * 0.5

    def _compute_keyword_score(self, text):
        if not text:
            return 0
            
        text = text.lower()
        words = re.findall(r'\b\w+\b', text)
        
        # Calculate dynamic keyword weights based on database confirmation patterns
        if self.keyword_pattern:
            dynamic_weight = 0.0
            found = False
            for word in words:
                if word in self.keyword_pattern:
                    dynamic_weight += self.keyword_pattern[word]
                    found = True
            if found:
                relevance = min(1.0, dynamic_weight)
                return self.WEIGHT_KEYWORDS * relevance
                
        # Fallback to static URGENT_KEYWORDS dictionary
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
            return self.WEIGHT_TIME_URGENCY * 0.85
        if days_diff <= 7:
            return self.WEIGHT_TIME_URGENCY * 0.6
        if days_diff <= 14:
            return self.WEIGHT_TIME_URGENCY * 0.4
            
        return self.WEIGHT_TIME_URGENCY * 0.2

    def _compute_user_behavior_score(self, event_data, attendance_history):
        if not attendance_history:
            return self.WEIGHT_USER_BEHAVIOR * 0.5 # Neutral if no history
            
        target_title = (event_data.get('event_context', '') + " " + event_data.get('title', '')).lower()
        target_duration = event_data.get('duration', 60)
        target_intent = event_data.get('entities', {}).get('intentType', 'event')
        
        target_date_str = event_data.get('date')
        target_time_str = event_data.get('time')
        target_dow = None
        target_hour = None
        
        if target_date_str:
            try: target_dow = datetime.strptime(target_date_str, "%Y-%m-%d").weekday()
            except: pass
        if target_time_str:
            try: target_hour = datetime.strptime(target_time_str, "%H:%M:%S").hour
            except: pass
            
        attended_weight = 0
        not_attended_weight = 0
        
        for hist_event in attendance_history:
            status = hist_event.get('attendanceStatus')
            if status not in ['attended', 'not_attended']:
                continue
                
            match_score = 0
            
            hist_title = hist_event.get('title', '').lower()
            if target_title and hist_title and self._are_titles_similar(target_title, hist_title):
                match_score += 3
            if hist_event.get('intentType') == target_intent:
                match_score += 1
                
            hist_dt_str = hist_event.get('dateTime')
            if hist_dt_str:
                try:
                    hist_dt = datetime.fromisoformat(hist_dt_str.replace('Z', '+00:00'))
                    if target_dow is not None and hist_dt.weekday() == target_dow:
                        match_score += 2
                    if target_hour is not None and hist_dt.hour == target_hour:
                        match_score += 1
                except: pass
                
            hist_dur = hist_event.get('duration')
            if hist_dur and target_duration and abs(hist_dur - target_duration) <= 15:
                match_score += 1
                
            if match_score > 0:
                if status == 'attended':
                    attended_weight += match_score
                else:
                    not_attended_weight += match_score
                    
        total = attended_weight + not_attended_weight
        if total == 0:
            return self.WEIGHT_USER_BEHAVIOR * 0.5 
            
        ratio = attended_weight / total
        return self.WEIGHT_USER_BEHAVIOR * ratio
        
    def _are_titles_similar(self, t1, t2):
        words1 = set(re.findall(r'\b\w+\b', t1))
        words2 = set(re.findall(r'\b\w+\b', t2))
        
        if not words1 or not words2:
            return False
            
        intersection = words1.intersection(words2)
        return len(intersection) > 0
