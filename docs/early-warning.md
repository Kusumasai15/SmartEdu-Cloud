# SmartEdu Cloud — Early-Warning System & Deduplication

## 1. Early-Warning Notification Strategy
The early-warning engine automatically detects academic risk escalations and attendance deficits across student cohorts:
- Triggers when a student's risk profile reaches `HIGH` or `CRITICAL` severity levels.
- Creates persistent `InsightAlert` records for in-app alert banners and advisor dashboards.

## 2. Alert Deduplication Architecture
To prevent student notification fatigue, all alerts implement cryptographic/semantic deduplication keys:

$$\text{Dedup Key} = \text{alert\_type} + \text{"\_"} + \text{student\_id} + \text{"\_"} + \text{snapshot\_date} + \text{"\_"} + \text{risk\_level}$$

- Unique database index `UniqueConstraint('dedup_key')` guarantees that multiple calculations on the same day never spawn duplicate notifications.
