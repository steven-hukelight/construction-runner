# Schema Drift Report
Generated: 2026-02-21T12:51:19.361Z


## Summary

| Category | Count |
|----------|-------|
| Tables in live DB not in migrations | 0 |
| Tables in migrations not in live DB | 4 |
| Missing columns | 0 |
| Extra columns (in live, not migrations) | 62 |
| Type mismatches | 4 |
| Missing indexes | 15 |
| Missing RLS policies | 5 |
| Tables with RLS enabled but no policies | 0 |

## Details

### Tables in migrations but missing in live DB


- near_miss
- offline_queue
- system_logs
- near_miss_reports


### Type mismatches


- profile_training.issue_date: live=date, expected=timestamptz
- profile_training.expiry_date: live=date, expected=timestamptz
- profile_certifications.issue_date: live=date, expected=timestamptz
- profile_certifications.expiry_date: live=date, expected=timestamptz


### Missing indexes


- near_miss.idx_near_miss_company_id
- near_miss.idx_near_miss_reviewed
- offline_queue.idx_offline_queue_user_id
- offline_queue.idx_offline_queue_company_id
- offline_queue.idx_offline_queue_synced_at
- near_miss.idx_near_miss_company_id
- near_miss.idx_near_miss_reviewed
- offline_queue.idx_offline_queue_user_id
- offline_queue.idx_offline_queue_company_id
- offline_queue.idx_offline_queue_synced_at
- system_logs.idx_system_logs_created_at
- system_logs.idx_system_logs_level
- near_miss_reports.idx_near_miss_reports_company_id
- near_miss_reports.idx_near_miss_reports_reported_by
- near_miss_reports.idx_near_miss_reports_reviewed


### Missing RLS policies


- system_logs: superuser_system_logs_all (ALL)
- near_miss_reports: superuser_near_miss_reports_all (ALL)
- near_miss_reports: admin_company_near_miss_reports (ALL)
- near_miss_reports: operative_insert_near_miss_reports (INSERT)
- near_miss_reports: operative_read_own_near_miss_reports (SELECT)

