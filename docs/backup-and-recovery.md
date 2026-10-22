# SmartEdu Cloud — PostgreSQL Backup & Disaster Recovery Strategy

## 1. Automated Daily Backups
Recommended cron execution for PostgreSQL:
```bash
pg_dump -U smartedu_user -d smartedu_db -F c -b -v -f "/backups/smartedu_$(date +\%Y\%m\%d_\%H\%M\%S).dump"
```

## 2. Retention Policy
- Daily snapshots retained for 14 days.
- Weekly snapshots retained for 8 weeks.
- Monthly snapshots retained for 12 months.

## 3. Disaster Recovery Restoration
```bash
# Drop existing target database and restore from custom archive
pg_restore -U smartedu_user -d smartedu_db -c -v "/backups/target_snapshot.dump"
# Run migrations to ensure latest schema alignment
alembic upgrade head
```
