# Notification System Test Commands

## Prerequisites
```bash
# Start the server
./start-server.sh

# Or manually:
PORT=3000 node apps/api/dist/main.js
```

## 1. Create Notification
```bash
curl -X POST http://localhost:3000/api/v1/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "type": "welcome",
    "channel": "email",
    "recipient": {
      "id": "user-123",
      "email": "test@example.com"
    },
    "content": {
      "text": "Welcome to our system!",
      "html": "<h1>Welcome!</h1><p>Your account has been created.</p>"
    },
    "priority": "normal",
    "metadata": {
      "source": "api-test",
      "userId": "user-123"
    },
    "tags": ["welcome", "onboarding"]
  }'
```

## 2. Get Notification
```bash
# Replace {notificationId} with actual ID from create response
curl -X GET http://localhost:3000/api/v1/notifications/{notificationId}
```

## 3. List Notifications
```bash
# Basic list
curl -X GET http://localhost:3000/api/v1/notifications

# With filters
curl -X GET "http://localhost:3000/api/v1/notifications?status=queued&limit=10&offset=0"

# Filter by priority
curl -X GET "http://localhost:3000/api/v1/notifications?priority=high&channel=email"
```

## 4. Update Notification Status
```bash
curl -X PATCH http://localhost:3000/api/v1/notifications/{notificationId}/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "sent",
    "metadata": {
      "sentAt": "2025-07-09T01:30:00Z",
      "provider": "test-provider"
    }
  }'
```

## 5. Healthcare Notification
```bash
curl -X POST http://localhost:3000/api/v1/notifications/healthcare \
  -H "Content-Type: application/json" \
  -d '{
    "type": "appointment-reminder",
    "channel": "email",
    "recipient": {
      "id": "patient-456",
      "email": "patient@example.com"
    },
    "content": {
      "text": "Appointment reminder: You have an appointment tomorrow at 2 PM.",
      "template": "appointment-reminder"
    },
    "healthcare": {
      "patientId": "patient-456",
      "providerId": "doctor-789",
      "appointmentId": "appt-123",
      "facilityId": "facility-001",
      "department": "Cardiology",
      "urgency": "medium",
      "hipaaCompliant": true
    },
    "priority": "high",
    "tags": ["appointment", "reminder", "healthcare"]
  }'
```

## 6. Cancel Notification
```bash
curl -X PATCH http://localhost:3000/api/v1/notifications/{notificationId}/cancel
```

## 7. Delete Notification
```bash
curl -X DELETE http://localhost:3000/api/v1/notifications/{notificationId}
```

## 8. Get Templates
```bash
curl -X GET http://localhost:3000/api/templates
```

## 9. Health Check
```bash
curl -X GET http://localhost:3000/health
```

## 10. API Documentation
Open in browser: http://localhost:3000/docs

## WebSocket Test (JavaScript)
```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = function() {
  console.log('Connected');
  
  // Subscribe to notifications
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'system:notifications'
  }));
};

ws.onmessage = function(event) {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

## Expected Responses

### Create Notification Success (201)
```json
{
  "success": true,
  "message": "Notification created successfully",
  "data": {
    "notificationId": "notif_1752024470689_fxqbqu5xp",
    "status": "queued",
    "priority": "normal",
    "createdAt": "2025-07-09T01:27:50.732Z"
  }
}
```

### Get Notification Success (200)
```json
{
  "success": true,
  "data": {
    "notification": {
      "id": "notif_1752024470689_fxqbqu5xp",
      "type": "welcome",
      "channel": "email",
      "status": "queued",
      "priority": "normal",
      "recipient": {
        "id": "user-123",
        "email": "test@example.com"
      },
      "subject": "Welcome to our system!",
      "attempts": 0,
      "maxAttempts": 3,
      "tags": ["welcome", "onboarding"],
      "metadata": {
        "source": "api-test",
        "userId": "user-123"
      }
    }
  }
}
```