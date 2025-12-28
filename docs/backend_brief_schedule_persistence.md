# Backend Brief: Schedule Fields Not Persisting

## Issue
After saving a backup schedule via the frontend, reopening the scheduler modal shows "manual" instead of the saved frequency.

## Root Cause (Likely)
The `GET /sites/` endpoint may not be returning schedule-related fields in the response.

## Required Fields
The sites list endpoint (`GET /sites/`) and individual site endpoint must return these fields for each site:

```json
{
  "id": 1,
  "name": "example.com",
  "wp_path": "/var/www/example/htdocs",
  ...
  "schedule_frequency": "daily",      // "manual" | "daily" | "weekly" | "monthly"
  "schedule_time": "02:00",           // HH:MM format (24-hour)
  "schedule_days": "0,2,4",           // Comma-separated day numbers (for weekly/monthly)
  "retention_copies": 7               // Integer
}
```

## Verification Steps

1. **Check PUT endpoint**: Confirm `PUT /sites/{id}/schedule` saves all fields correctly
2. **Check GET endpoint**: Confirm `GET /sites/` includes schedule fields in response
3. **Check database**: Verify columns exist and are populated after save

## Expected Payload (Save)
```json
PUT /sites/{id}/schedule
{
  "schedule_frequency": "weekly",
  "schedule_time": "03:00",
  "schedule_days": "1,3,5",
  "retention_copies": 5
}
```

## Expected Response (List)
```json
GET /sites/
{
  "sites": [
    {
      "id": 1,
      "name": "example.com",
      "schedule_frequency": "weekly",
      "schedule_time": "03:00",
      "schedule_days": "1,3,5",
      "retention_copies": 5,
      ...
    }
  ],
  "total": 1
}
```
