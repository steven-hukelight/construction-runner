-- =============================================================================
-- FIRESTORE RECONSTRUCTION - INSERT STATEMENTS
-- Run AFTER RECONSTRUCTED_SCHEMA.sql
-- Preserves Firestore document IDs. Timestamps normalized from Firestore format.
-- =============================================================================

-- COMPANIES
INSERT INTO firestore_companies (id, invite_code, name, created_at, updated_at) VALUES
('4z4X06S76kEDueYPZxKg', 'PYLD38VM', 'Wilton Electrics Ltd', '2026-02-08T21:35:48.670Z'::timestamptz, NULL),
('iQlyANp6sZVztRrAeJGr', '2UIIZKCU', 'Test Company Ltd', '2026-02-07T15:28:47.347Z'::timestamptz, '2026-02-09T20:44:54.360Z'::timestamptz)
ON CONFLICT (id) DO NOTHING;

-- USERS (profile_id set after profiles)
INSERT INTO firestore_users (id, uid, company_id, profile_id, email, role, disabled, approved, superuser, status, name, display_name, phone, notes, bio, avatar, location, fcm_token, pre_induction_status, admin_pre_induction_override, compliance_score, last_login, created_at, updated_at) VALUES
('Dm6DoolWXHRScr4jyhuQDGzZD4z1', 'Dm6DoolWXHRScr4jyhuQDGzZD4z1', 'iQlyANp6sZVztRrAeJGr', NULL, 'sh.light@yahoo.com', 'ADMIN', false, true, NULL, 'Active', 'Steve Light', 'Steve Light', '07968546309', '', '', '', 'london', NULL, 'not_started', true, NULL, '2026-02-13T23:18:50.705Z'::timestamptz, '2026-01-30T06:35:21.344Z'::timestamptz, '2026-02-13T23:18:50.705Z'::timestamptz),
('N5msItCZdPZ2tAVhD2zLEQRY5Pc2', 'N5msItCZdPZ2tAVhD2zLEQRY5Pc2', '4z4X06S76kEDueYPZxKg', NULL, 'steve@wiltonelectrics.co.uk', 'ADMIN', false, true, NULL, 'Active', 'Steven Light', 'Steven Light', '07944940392', '', '', '', 'London', NULL, 'not_started', false, NULL, '2026-02-12T19:12:03.756Z'::timestamptz, '2026-02-08T21:35:50.074Z'::timestamptz, '2026-02-12T19:12:03.756Z'::timestamptz),
('W1BARv21DgaxKN6vrYdzb5wMRaY2', 'W1BARv21DgaxKN6vrYdzb5wMRaY2', NULL, NULL, 'steven_hukelight@yahoo.co.uk', 'SUPERUSER', false, true, true, 'Active', 'Steven Huke-Light', NULL, '07944054718', '', '', '', 'London UK', NULL, 'in_progress', true, 10, '2026-02-12T23:16:59.859Z'::timestamptz, NULL, '2026-02-12T23:16:59.859Z'::timestamptz),
('jEjtULRIQyXGmtDh5DnHuG6Kouf1', NULL, 'iQlyANp6sZVztRrAeJGr', NULL, 'oliver@baileydesign.uk', 'ADMIN', false, true, NULL, NULL, 'Oliver Bailey', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'not_started', true, NULL, NULL, '2026-01-20T21:38:32.666Z'::timestamptz, NULL)
ON CONFLICT (id) DO NOTHING;

-- SITES
INSERT INTO firestore_sites (id, company_id, name, location, geofence, latitude, longitude, radius_meters, show_on_map, active, manager_id, created_at) VALUES
('3VwQOYQ7xd5jMoQAf9j8', 'iQlyANp6sZVztRrAeJGr', 'Royal Arsenal RAR', '{"address":null,"lat":51.494237,"lng":0.064942}'::jsonb, '{"center":{"lat":51.494237,"lng":0.064942},"radiusMeters":null,"polygon":[{"lat":51.49397991158212,"lng":0.0642979145050049},{"lat":51.494621162079625,"lng":0.0641906261444092},{"lat":51.494734715915065,"lng":0.06587505340576173},{"lat":51.493852996351826,"lng":0.06603598594665529}]}'::jsonb, 51.494237, 0.064942, NULL, true, true, NULL, '2026-02-04T21:54:34.046Z'::timestamptz),
('FXmuvWsrXPezSXnabe5V', 'iQlyANp6sZVztRrAeJGr', 'Plumstead (Lombard Square) PWT', '{"address":null,"lat":51.491913,"lng":0.088685}'::jsonb, '{"center":{"lat":51.491913,"lng":0.088685},"radiusMeters":null,"polygon":[{"lat":51.4909712158045,"lng":0.08619546890258789},{"lat":51.492400752025056,"lng":0.08623838424682619},{"lat":51.49309546372213,"lng":0.0868821144104004},{"lat":51.49236067218107,"lng":0.0910019874572754},{"lat":51.49248091160734,"lng":0.0915384292602539},{"lat":51.4919732318724,"lng":0.09198904037475587},{"lat":51.490744089100666,"lng":0.08795499801635742}]}'::jsonb, 51.491913, 0.088685, NULL, true, true, NULL, '2026-02-04T21:45:58.102Z'::timestamptz),
('Fyt4RIl30f1ofJpdeAoG', 'iQlyANp6sZVztRrAeJGr', 'Kidbrooke Village KV3G', '{"address":null,"lat":51.460071,"lng":0.028678}'::jsonb, '{"center":{"lat":51.460071,"lng":0.028678},"radiusMeters":null,"polygon":[{"lat":51.460395176235515,"lng":0.026800632476806644},{"lat":51.46060908484844,"lng":0.02940773963928223},{"lat":51.45963980342511,"lng":0.02972960472106934},{"lat":51.45947936865225,"lng":0.027776956558227543},{"lat":51.459486053445694,"lng":0.027648210525512695},{"lat":51.46005425731149,"lng":0.026865005493164066}]}'::jsonb, 51.460071, 0.028678, NULL, true, true, NULL, '2026-01-29T23:01:34.539Z'::timestamptz),
('sfBugkMBuzry8U6lzqkj', 'iQlyANp6sZVztRrAeJGr', 'Home', '{"address":"Home","lat":51.43245,"lng":0.05634}'::jsonb, '{"center":{"lat":51.43245,"lng":0.05634},"radiusMeters":5000,"polygon":null}'::jsonb, 51.43245, 0.05634, 5000, true, true, NULL, '2026-02-02T23:21:02.267Z'::timestamptz)
ON CONFLICT (id) DO NOTHING;

-- PROFILES
INSERT INTO firestore_profiles (id, user_id, address_line1, town, postcode, emergency_contact_name, emergency_contact_phone, job_title, national_insurance, ni_number, utr, utr_number, date_of_birth, updated_at) VALUES
('kyON0jXxnaIuOgx0mcbC', 'W1BARv21DgaxKN6vrYdzb5wMRaY2', '72 Wynford Way', 'Eltham London', 'SE9 3EE', 'Katy Light', '07841346768', 'Electrical Site Manager', 'JT743333B', 'JT743333B', '1234567890', '1234567890', '1983-07-04', '2026-02-04T22:08:58.647Z'::timestamptz)
ON CONFLICT (id) DO NOTHING;

-- Link user to profile (circular ref)
UPDATE firestore_users SET profile_id = 'kyON0jXxnaIuOgx0mcbC' WHERE id = 'W1BARv21DgaxKN6vrYdzb5wMRaY2';

-- TASKS
INSERT INTO firestore_tasks (id, company_id, site_id, title, description, status, created_at) VALUES
('LjuQRKBF9VChCTvSUBEr', 'iQlyANp6sZVztRrAeJGr', NULL, 'Automated Test Task', 'Task created by automated QA', 'pending', '2026-01-24T18:01:25.497Z'::timestamptz)
ON CONFLICT (id) DO NOTHING;

-- NOTICES
INSERT INTO firestore_notices (id, company_id, site_id, title, body, created_at) VALUES
('yDCqT5JYP4NuPz5ULyp1', 'iQlyANp6sZVztRrAeJGr', NULL, 'Automated Test Notice', 'Notice created by automated QA', '2026-01-24T18:01:25.580Z'::timestamptz)
ON CONFLICT (id) DO NOTHING;

-- DELIVERIES
INSERT INTO firestore_deliveries (id, company_id, site_id, created_by, pod_url, load_url, wholesaler, status, reference, site, notes, scheduled_at, created_at) VALUES
('jIqivjUlTma9saPJSiJT', 'iQlyANp6sZVztRrAeJGr', NULL, 'W1BARv21DgaxKN6vrYdzb5wMRaY2', 'https://firebasestorage.googleapis.com/v0/b/sitehub-pilot.firebasestorage.app/o/deliveries%2FEdmunsons_2026-02-05T22-28-21.742355Z%2Fpod.jpg?alt=media&token=99a22942-e043-432b-86b7-d3e965fbb41f', 'https://firebasestorage.googleapis.com/v0/b/sitehub-pilot.firebasestorage.app/o/deliveries%2FEdmunsons_2026-02-05T22-28-21.742355Z%2Fload.jpg?alt=media&token=770a6050-77ae-4646-95ef-3e2b1bcd5bd3', 'Edmunsons', 'RECEIVED', NULL, NULL, NULL, NULL, '2026-02-05T22:28:35.843Z'::timestamptz),
('mLws9jwBOlgcpR3BMm7K', NULL, NULL, 'W1BARv21DgaxKN6vrYdzb5wMRaY2', 'https://firebasestorage.googleapis.com/v0/b/sitehub-pilot.firebasestorage.app/o/deliveries%2FMedlocks_2026-02-12T23-01-41.250030Z%2Fpod.jpg?alt=media&token=7b8cad52-0099-4236-b7d7-8f31e807dbff', 'https://firebasestorage.googleapis.com/v0/b/sitehub-pilot.firebasestorage.app/o/deliveries%2FMedlocks_2026-02-12T23-01-41.250030Z%2Fload.jpg?alt=media&token=3dbbdc2f-6e2d-44d2-9f67-8e7233932978', 'Medlocks', 'PENDING', 'mobile check', NULL, NULL, '2026-02-12T23:00:27.543Z'::timestamptz, '2026-02-12T23:01:55.434Z'::timestamptz),
('u3kgJKAqgdU82004L9kq', NULL, 'sfBugkMBuzry8U6lzqkj', 'W1BARv21DgaxKN6vrYdzb5wMRaY2', 'https://firebasestorage.googleapis.com/v0/b/sitehub-pilot.firebasestorage.app/o/deliveries%2FMedlocks_2026-02-12T23-13-55.812636Z%2Fpod.jpg?alt=media&token=c72483a8-06f6-4d3f-9ff5-6cd4ed77a1d7', 'https://firebasestorage.googleapis.com/v0/b/sitehub-pilot.firebasestorage.app/o/deliveries%2FMedlocks_2026-02-12T23-13-55.812636Z%2Fload.jpg?alt=media&token=f4a40f83-0cda-4107-8bd3-bf365e01e570', 'Medlocks', 'PENDING', 'mobile test 2', 'Home', NULL, '2026-02-12T23:13:20.045Z'::timestamptz, '2026-02-12T23:14:10.312Z'::timestamptz)
ON CONFLICT (id) DO NOTHING;

-- SETTINGS
INSERT INTO firestore_settings (id, company_id, display, updated_at) VALUES
('W1BARv21DgaxKN6vrYdzb5wMRaY2', 'test company ltd', '{"dateFormat":"DD/MM/YYYY","timeFormat":"24 Hour","language":"English (UK)","darkMode":false}'::jsonb, '2026-02-06T06:30:06.550Z'::timestamptz),
('steven_hukelight_yahoo_co_uk', 'test company ltd', '{"dateFormat":"DD/MM/YYYY","timeFormat":"24 Hour","language":"English (UK)","darkMode":true}'::jsonb, '2026-02-05T22:59:22.489Z'::timestamptz)
ON CONFLICT (id) DO NOTHING;

-- REGISTRATIONS (company_id may reference companies not in export - no FK)
INSERT INTO firestore_registrations (id, company_id, email, name, company_name, role, status, created_at, approved_at, rejected_at) VALUES
('0Z7al007abqv8zK0lDix', 'n5ppOhPtsJtF5KBIqmLl', 'steve@wiltonelecttrics.co.uk', 'Steven Light', 'Wilton Electrics Ltd', 'ADMIN', 'REJECTED', '2026-02-07T20:15:55.387Z'::timestamptz, NULL, '2026-02-07T23:00:36.837Z'::timestamptz),
('8yU510RZyjZDeBT90wFB', 'iQlyANp6sZVztRrAeJGr', 'testadmin2@sitehub.com', 'Test Admin 2', 'Test Company Ltd', 'WORKER', 'REJECTED', '2026-02-07T15:28:49.707Z'::timestamptz, NULL, '2026-02-07T23:00:28.144Z'::timestamptz),
('9i867zFkaF3ZnWD6qOIH', '3XrfgPliNJBpfOkKqapZ', 'steve@wiltonelectrics.co.uk', 'Steven Light', 'Wilton Electrics Ltd', 'ADMIN', 'APPROVED', '2026-02-07T22:39:34.586Z'::timestamptz, '2026-02-07T22:40:01.448Z'::timestamptz, NULL),
('C1TjolTGORZXBJUOnxHu', 'H2d8cV1IkoBedFr5Pacm', 'steve@wiltonelectrics.co.uk', 'Steven Huke-Light', 'Wilton Electrics Ltd', NULL, 'APPROVED', '2026-02-07T12:03:00.731Z'::timestamptz, NULL, NULL),
('FShxeYFbCLkn7DtuGPLn', '5p2BnVvJ6YsZI2c7Oene', 'steve@wiltonelectrics.co.uk', 'Steven Light', 'Wilton Electrics Ltd', 'ADMIN', 'REJECTED', '2026-02-07T22:23:57.804Z'::timestamptz, NULL, '2026-02-07T23:00:34.965Z'::timestamptz),
('HYnXk0kEYkcUxEGJ556F', 'iP4eizGxYWRPxzKAYldY', 'steve@wiltonelectrics.co.uk', 'Steven Light', 'Wilton Electrics Ltd', 'ADMIN', 'REJECTED', '2026-02-07T22:01:59.925Z'::timestamptz, NULL, '2026-02-07T23:00:35.722Z'::timestamptz),
('OTQvfDCORSnaHT26iITK', 'BBnlqCkjaPG3dLKSGL6I', 'steve@wiltonelectrics.co.uk', 'Steven Light', 'Wilton Electrics Ltd', 'ADMIN', 'APPROVED', '2026-02-08T21:24:59.430Z'::timestamptz, '2026-02-08T21:25:24.808Z'::timestamptz, NULL),
('SrL6HaR4bd47ooXUFeVu', 'JEdD0DbzYkHUChu5QRYq', 'steve@wiltonelectrics.co.uk', 'Steven Light', 'Wilton Electrics Ltd', 'ADMIN', 'REJECTED', '2026-02-07T22:55:24.355Z'::timestamptz, NULL, '2026-02-07T23:00:34.233Z'::timestamptz),
('TA9PDc4TIDSQ7SvwLvhD', '7QCsbsgJqOgrL77S6L78', 'steve@wiltonelectrics.co.uk', 'Steven Huke-Light', 'Wilton Electrics Ld', 'ADMIN', 'APPROVED', '2026-02-08T00:05:42.042Z'::timestamptz, '2026-02-08T00:06:19.925Z'::timestamptz, NULL),
('azuI3xalmwVCmdBTtEhL', 'ASzOiT9xZze2NRwdY6tn', 'steve@wiltonelectrics.co.uk', 'Steven Light', 'Wilton Electrics Ltd', 'ADMIN', 'APPROVED', '2026-02-07T23:01:32.754Z'::timestamptz, '2026-02-07T23:01:53.314Z'::timestamptz, NULL),
('i7REyhWagdHT4tiuK0HA', 'uWzQU5Diy04kwjODS6iQ', 'steve@wiltonelecrics.co.uk', 'Steven Light', 'Wilton Electrics Ltd', 'ADMIN', 'APPROVED', '2026-02-08T00:16:20.118Z'::timestamptz, '2026-02-08T00:16:39.688Z'::timestamptz, NULL),
('n1Kh4bsKMul3K7y6xHbv', 'TgVp4xaWFBuhHtDGDvFM', 'steve@wiltonelectrics.co.uk', 'Steven Light', 'Wilton Electrics Ltd', 'ADMIN', 'APPROVED', '2026-02-08T19:58:19.242Z'::timestamptz, '2026-02-08T21:08:39.638Z'::timestamptz, NULL),
('szJ6XjrQzZubslxQO3Ju', '4z4X06S76kEDueYPZxKg', 'steve@wiltonelectrics.co.uk', 'Steven Light', 'Wilton Electrics Ltd', 'ADMIN', 'APPROVED', '2026-02-08T21:35:49.206Z'::timestamptz, '2026-02-08T21:36:41.654Z'::timestamptz, NULL),
('x11JNXC5m0LUtWhAFPdn', 'iQlyANp6sZVztRrAeJGr', 'testadmin@sitehub.com', 'Test Admin', 'Test Company Ltd', 'ADMIN', 'REJECTED', '2026-02-07T15:28:47.559Z'::timestamptz, NULL, '2026-02-07T23:00:27.352Z'::timestamptz),
('y8wCqL27D0jcluNIu0bf', '6uIL5eVHzX969tAtanYn', 'steve@wiltonelectrics.co.uk', 'Steven Light', 'Wilton Electrics Ltd', 'ADMIN', 'APPROVED', '2026-02-08T10:01:53.038Z'::timestamptz, '2026-02-08T10:05:12.134Z'::timestamptz, NULL),
('znERWPIblek7QBtdDGUR', 'd7PSiaNXGt0oGv6SQKkZ', 'steve@wiltonelectrics.co.uk', 'Steven Light', 'Wilton Electrics Ltd', 'ADMIN', 'APPROVED', '2026-02-07T22:27:53.515Z'::timestamptz, '2026-02-07T22:34:41.420Z'::timestamptz, NULL)
ON CONFLICT (id) DO NOTHING;

-- USER_PROFILE (users/{userId}/profile/data)
INSERT INTO firestore_user_profile (user_id, doc_id, emergency_contact_name, emergency_contact_phone, job_title, ni_number, utr_number, date_of_birth, edit_history, updated_at) VALUES
('Dm6DoolWXHRScr4jyhuQDGzZD4z1', 'data', 'A person', '07986578432', 'the boss', 'TH198544B', '0987654321', '1995-07-06', '[{"timestamp":"2026-02-09T21:25:51.298Z","editedFields":["jobTitle","emergencyContactName","emergencyContactPhone","niNumber","utrNumber","dateOfBirth"]}]'::jsonb, '2026-02-09T21:26:08.977Z'::timestamptz),
('N5msItCZdPZ2tAVhD2zLEQRY5Pc2', 'data', 'Test', '07900000000', 'Project Manager', 'AB123456A', '1234567890', '1975-03-01', '[]'::jsonb, '2026-02-09T21:23:13.221Z'::timestamptz),
('W1BARv21DgaxKN6vrYdzb5wMRaY2', 'data', 'Katy Light', '07841346768', 'Electrical Site Manager', 'JT743333B', '1234567890', '1983-07-04', '[{"timestamp":{"_timestamp":"2026-02-09T20:52:04.889Z"},"editedFields":["jobTitle","emergencyContactName","emergencyContactPhone","niNumber","utrNumber","dateOfBirth"]}]'::jsonb, '2026-02-09T20:52:04.833Z'::timestamptz)
ON CONFLICT (user_id, doc_id) DO NOTHING;

-- PRE_INDUCTION_PERSONAL (users/{userId}/preInductionProfile/personal)
INSERT INTO firestore_pre_induction_personal (user_id, full_name, date_of_birth, phone, email, address, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, supervisor_name, utr_number, updated_at) VALUES
('W1BARv21DgaxKN6vrYdzb5wMRaY2', 'Steven Huke-Light', '1983-07-04', '07944054718', 'steven_hukelight@yahoo.co.uk', '72 Wynford Way, Eltham, London\nSE9 3EE', 'Katy Light', 'Wife', '07841346768', '', '', '2026-02-12T21:56:37.094Z'::timestamptz)
ON CONFLICT (user_id) DO NOTHING;

-- PRE_INDUCTION_DECLARATIONS (users/{userId}/preInductionProfile/declarations)
INSERT INTO firestore_pre_induction_declarations (user_id, operative_declaration_accepted, operative_declaration_accepted_at, supervisor_declaration_accepted, supervisor_declaration_accepted_at, updated_at) VALUES
('W1BARv21DgaxKN6vrYdzb5wMRaY2', true, '2026-02-12T21:57:23.033Z'::timestamptz, true, '2026-02-12T21:57:23.033Z'::timestamptz, '2026-02-12T21:57:23.131Z'::timestamptz)
ON CONFLICT (user_id) DO NOTHING;

-- PROFILE_CERTIFICATIONS (profiles/{profileId}/certifications)
INSERT INTO firestore_profile_certifications (id, profile_id, title, issuer, issue_date, expiry_date, attachment_url, attachment_type, created_at, updated_at) VALUES
('8uJqOBCCfXYKSkrFJkIt', 'kyON0jXxnaIuOgx0mcbC', 'Managers ECS Card', 'ECS', NULL, '2029-05-22T23:00:00.000Z'::timestamptz, 'https://firebasestorage.googleapis.com/v0/b/sitehub-pilot.firebasestorage.app/o/certifications_attachments%2FW1BARv21DgaxKN6vrYdzb5wMRaY2%2F20220711_092934.jpg?alt=media&token=b9b5d927-32b3-406b-9e8b-eb4e2127d1d1', 'jpg', '2026-02-03T19:32:20.503Z'::timestamptz, '2026-02-03T19:32:20.503Z'::timestamptz)
ON CONFLICT (profile_id, id) DO NOTHING;

-- PROFILE_TRAINING (profiles/{profileId}/training)
INSERT INTO firestore_profile_training (id, profile_id, title, issuer, issue_date, expiry_date, completed_at, attachment_url, attachment_type, created_at, updated_at) VALUES
('mIDfdnkCzgkRGxKe6bMQ', 'kyON0jXxnaIuOgx0mcbC', '18th Edition', 'City & Guilds', '2025-03-03T00:00:00.137Z'::timestamptz, NULL, NULL, 'https://firebasestorage.googleapis.com/v0/b/sitehub-pilot.firebasestorage.app/o/training_attachments%2FW1BARv21DgaxKN6vrYdzb5wMRaY2%2FSteven%20Robert%20William%20Huke-Light%20(1).pdf?alt=media&token=69fb2ca4-11be-4bb9-bcbf-5c1597b7c571', 'pdf', '2026-02-03T19:46:42.892Z'::timestamptz, '2026-02-03T19:46:42.892Z'::timestamptz)
ON CONFLICT (profile_id, id) DO NOTHING;
