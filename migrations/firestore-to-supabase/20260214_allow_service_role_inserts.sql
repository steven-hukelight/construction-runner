-- Allow inserts for service_role during migration

create policy "Allow insert for service_role (migration)" on companies for insert using (auth.role() = 'service_role');
create policy "Allow insert for service_role (migration)" on users for insert using (auth.role() = 'service_role');
create policy "Allow insert for service_role (migration)" on sites for insert using (auth.role() = 'service_role');
create policy "Allow insert for service_role (migration)" on settings for insert using (auth.role() = 'service_role');
create policy "Allow insert for service_role (migration)" on attendance for insert using (auth.role() = 'service_role');
create policy "Allow insert for service_role (migration)" on tasks for insert using (auth.role() = 'service_role');
create policy "Allow insert for service_role (migration)" on notices for insert using (auth.role() = 'service_role');
create policy "Allow insert for service_role (migration)" on deliveries for insert using (auth.role() = 'service_role');
create policy "Allow insert for service_role (migration)" on rams for insert using (auth.role() = 'service_role');
create policy "Allow insert for service_role (migration)" on briefings for insert using (auth.role() = 'service_role');
create policy "Allow insert for service_role (migration)" on coshh for insert using (auth.role() = 'service_role');
create policy "Allow insert for service_role (migration)" on site_rules for insert using (auth.role() = 'service_role');
create policy "Allow insert for service_role (migration)" on safety_alerts for insert using (auth.role() = 'service_role');
create policy "Allow insert for service_role (migration)" on certifications for insert using (auth.role() = 'service_role');
create policy "Allow insert for service_role (migration)" on training for insert using (auth.role() = 'service_role');
create policy "Allow insert for service_role (migration)" on user_profile_data for insert using (auth.role() = 'service_role');
create policy "Allow insert for service_role (migration)" on assigned_operatives for insert using (auth.role() = 'service_role');
