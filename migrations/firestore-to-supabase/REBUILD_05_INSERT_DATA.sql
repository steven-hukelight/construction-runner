-- =============================================================================
-- Construction Runner REBUILD - STEP 5: IMPORT FIRESTORE JSON DATA
-- =============================================================================
-- Inserts raw data. user_id and created_by left NULL for backfill.
-- firebase_uid stored for mapping.
-- Run with service_role or as postgres to bypass RLS.
-- =============================================================================

-- 1. COMPANIES
INSERT INTO companies (id, invite_code, name, created_at, updated_at) VALUES
('4z4X06S76kEDueYPZxKg', 'PYLD38VM', 'Wilton Electrics Ltd', '2026-02-08T21:35:48.670Z'::timestamptz, NULL),
('iQlyANp6sZVztRrAeJGr', '2UIIZKCU', 'Test Company Ltd', '2026-02-07T15:28:47.347Z'::timestamptz, '2026-02-09T20:44:54.360Z'::timestamptz);

-- 2. USERS (id = gen_random_uuid, firebase_uid = Firestore uid)
INSERT INTO users (id, firebase_uid, company_id, email, phone, display_name, name, role, status, disabled, approved, superuser, created_at, updated_at) VALUES
(gen_random_uuid(), 'Dm6DoolWXHRScr4jyhuQDGzZD4z1', 'iQlyANp6sZVztRrAeJGr', 'sh.light@yahoo.com', '07968546309', 'Steve Light', 'Steve Light', 'ADMIN', 'Active', false, true, false, '2026-01-30T06:35:21.344Z'::timestamptz, '2026-02-13T23:18:50.705Z'::timestamptz),
(gen_random_uuid(), 'N5msItCZdPZ2tAVhD2zLEQRY5Pc2', '4z4X06S76kEDueYPZxKg', 'steve@wiltonelectrics.co.uk', '07944940392', 'Steven Light', 'Steven Light', 'ADMIN', 'Active', false, true, false, '2026-02-08T21:35:50.074Z'::timestamptz, '2026-02-12T19:12:03.756Z'::timestamptz),
(gen_random_uuid(), 'W1BARv21DgaxKN6vrYdzb5wMRaY2', 'iQlyANp6sZVztRrAeJGr', 'steven_hukelight@yahoo.co.uk', '07944054718', NULL, 'Steven Huke-Light', 'SUPERUSER', 'Active', false, true, true, '2026-02-12T23:16:59.859Z'::timestamptz, '2026-02-12T23:16:59.859Z'::timestamptz),
(gen_random_uuid(), 'jEjtULRIQyXGmtDh5DnHuG6Kouf1', 'iQlyANp6sZVztRrAeJGr', 'oliver@baileydesign.uk', NULL, NULL, 'Oliver Bailey', 'ADMIN', NULL, false, true, false, '2026-01-20T21:38:32.666Z'::timestamptz, NULL);

-- 3. SITES
INSERT INTO sites (id, company_id, name, location, geofence, latitude, longitude, radius_meters, show_on_map, active, created_at) VALUES
('3VwQOYQ7xd5jMoQAf9j8', 'iQlyANp6sZVztRrAeJGr', 'Royal Arsenal RAR', '{"address":null,"lat":51.494237,"lng":0.064942}'::jsonb, '{"center":{"lat":51.494237,"lng":0.064942},"radiusMeters":null,"polygon":[{"lat":51.49397991158212,"lng":0.0642979145050049},{"lat":51.494621162079625,"lng":0.0641906261444092},{"lat":51.494734715915065,"lng":0.06587505340576173},{"lat":51.493852996351826,"lng":0.06603598594665529}]}'::jsonb, 51.494237, 0.064942, NULL, true, true, '2026-02-04T21:54:34.046Z'::timestamptz),
('FXmuvWsrXPezSXnabe5V', 'iQlyANp6sZVztRrAeJGr', 'Plumstead (Lombard Square) PWT', '{"address":null,"lat":51.491913,"lng":0.088685}'::jsonb, '{"center":{"lat":51.491913,"lng":0.088685},"radiusMeters":null,"polygon":[{"lat":51.4909712158045,"lng":0.08619546890258789},{"lat":51.492400752025056,"lng":0.08623838424682619},{"lat":51.49309546372213,"lng":0.0868821144104004},{"lat":51.49236067218107,"lng":0.0910019874572754},{"lat":51.49248091160734,"lng":0.0915384292602539},{"lat":51.4919732318724,"lng":0.09198904037475587},{"lat":51.490744089100666,"lng":0.08795499801635742}]}'::jsonb, 51.491913, 0.088685, NULL, true, true, '2026-02-04T21:45:58.102Z'::timestamptz),
('Fyt4RIl30f1ofJpdeAoG', 'iQlyANp6sZVztRrAeJGr', 'Kidbrooke Village KV3G', '{"address":null,"lat":51.460071,"lng":0.028678}'::jsonb, '{"center":{"lat":51.460071,"lng":0.028678},"radiusMeters":null,"polygon":[{"lat":51.460395176235515,"lng":0.026800632476806644},{"lat":51.46060908484844,"lng":0.02940773963928223},{"lat":51.45963980342511,"lng":0.02972960472106934},{"lat":51.45947936865225,"lng":0.027776956558227543},{"lat":51.459486053445694,"lng":0.027648210525512695},{"lat":51.46005425731149,"lng":0.026865005493164066}]}'::jsonb, 51.460071, 0.028678, NULL, true, true, '2026-01-29T23:01:34.539Z'::timestamptz),
('sfBugkMBuzry8U6lzqkj', 'iQlyANp6sZVztRrAeJGr', 'Home', '{"address":"Home","lat":51.43245,"lng":0.05634}'::jsonb, '{"center":{"lat":51.43245,"lng":0.05634},"radiusMeters":5000,"polygon":null}'::jsonb, 51.43245, 0.05634, 5000, true, true, '2026-02-02T23:21:02.267Z'::timestamptz);

-- 4. PROFILES (user_id NULL, firebase_uid = userId)
INSERT INTO profiles (id, user_id, firebase_uid, address_line1, town, postcode, emergency_contact_name, emergency_contact_phone, job_title, national_insurance, ni_number, utr, utr_number, date_of_birth, updated_at) VALUES
('kyON0jXxnaIuOgx0mcbC', NULL, 'W1BARv21DgaxKN6vrYdzb5wMRaY2', '72 Wynford Way', 'Eltham London', 'SE9 3EE', 'Katy Light', '07841346768', 'Electrical Site Manager', 'JT743333B', 'JT743333B', '1234567890', '1234567890', '1983-07-04', '2026-02-04T22:08:58.647Z'::timestamptz);

-- 5. PROFILE_CERTIFICATIONS
INSERT INTO profile_certifications (id, profile_id, title, issuer, issue_date, expiry_date, attachment_url, attachment_type, created_at, updated_at) VALUES
('8uJqOBCCfXYKSkrFJkIt', 'kyON0jXxnaIuOgx0mcbC', 'Managers ECS Card', 'ECS', NULL, '2029-05-22T23:00:00.000Z'::timestamptz, 'https://firebasestorage.googleapis.com/v0/b/sitehub-pilot.firebasestorage.app/o/certifications_attachments%2FW1BARv21DgaxKN6vrYdzb5wMRaY2%2F20220711_092934.jpg?alt=media&token=b9b5d927-32b3-406b-9e8b-eb4e2127d1d1', 'jpg', '2026-02-03T19:32:20.503Z'::timestamptz, '2026-02-03T19:32:20.503Z'::timestamptz);

-- 6. PROFILE_TRAINING
INSERT INTO profile_training (id, profile_id, title, issuer, issue_date, expiry_date, completed_at, attachment_url, attachment_type, created_at, updated_at) VALUES
('mIDfdnkCzgkRGxKe6bMQ', 'kyON0jXxnaIuOgx0mcbC', '18th Edition', 'City & Guilds', '2025-03-03T00:00:00.137Z'::timestamptz, NULL, NULL, 'https://firebasestorage.googleapis.com/v0/b/sitehub-pilot.firebasestorage.app/o/training_attachments%2FW1BARv21DgaxKN6vrYdzb5wMRaY2%2FSteven%20Robert%20William%20Huke-Light%20(1).pdf?alt=media&token=69fb2ca4-11be-4bb9-bcbf-5c1597b7c571', 'pdf', '2026-02-03T19:46:42.892Z'::timestamptz, '2026-02-03T19:46:42.892Z'::timestamptz);

-- 7. DELIVERIES (created_by NULL, firebase_uid = createdBy)
INSERT INTO deliveries (id, company_id, site_id, created_by, firebase_uid, pod_url, load_url, wholesaler, status, reference, site, notes, scheduled_at, created_at) VALUES
('jIqivjUlTma9saPJSiJT', 'iQlyANp6sZVztRrAeJGr', NULL, NULL, 'W1BARv21DgaxKN6vrYdzb5wMRaY2', 'https://firebasestorage.googleapis.com/v0/b/sitehub-pilot.firebasestorage.app/o/deliveries%2FEdmunsons_2026-02-05T22-28-21.742355Z%2Fpod.jpg?alt=media&token=99a22942-e043-432b-86b7-d3e965fbb41f', 'https://firebasestorage.googleapis.com/v0/b/sitehub-pilot.firebasestorage.app/o/deliveries%2FEdmunsons_2026-02-05T22-28-21.742355Z%2Fload.jpg?alt=media&token=770a6050-77ae-4646-95ef-3e2b1bcd5bd3', 'Edmunsons', 'RECEIVED', NULL, NULL, NULL, NULL, '2026-02-05T22:28:35.843Z'::timestamptz),
('mLws9jwBOlgcpR3BMm7K', NULL, NULL, NULL, 'W1BARv21DgaxKN6vrYdzb5wMRaY2', 'https://firebasestorage.googleapis.com/v0/b/sitehub-pilot.firebasestorage.app/o/deliveries%2FMedlocks_2026-02-12T23-01-41.250030Z%2Fpod.jpg?alt=media&token=7b8cad52-0099-4236-b7d7-8f31e807dbff', 'https://firebasestorage.googleapis.com/v0/b/sitehub-pilot.firebasestorage.app/o/deliveries%2FMedlocks_2026-02-12T23-01-41.250030Z%2Fload.jpg?alt=media&token=3dbbdc2f-6e2d-44d2-9f67-8e7233932978', 'Medlocks', 'PENDING', 'mobile check', NULL, NULL, '2026-02-12T23:00:27.543Z'::timestamptz, '2026-02-12T23:01:55.434Z'::timestamptz),
('u3kgJKAqgdU82004L9kq', NULL, 'sfBugkMBuzry8U6lzqkj', NULL, 'W1BARv21DgaxKN6vrYdzb5wMRaY2', 'https://firebasestorage.googleapis.com/v0/b/sitehub-pilot.firebasestorage.app/o/deliveries%2FMedlocks_2026-02-12T23-13-55.812636Z%2Fpod.jpg?alt=media&token=c72483a8-06f6-4d3f-9ff5-6cd4ed77a1d7', 'https://firebasestorage.googleapis.com/v0/b/sitehub-pilot.firebasestorage.app/o/deliveries%2FMedlocks_2026-02-12T23-13-55.812636Z%2Fload.jpg?alt=media&token=f4a40f83-0cda-4107-8bd3-bf365e01e570', 'Medlocks', 'PENDING', 'mobile test 2', 'Home', NULL, '2026-02-12T23:13:20.045Z'::timestamptz, '2026-02-12T23:14:10.312Z'::timestamptz);

-- 8. NOTICES
INSERT INTO notices (id, company_id, site_id, title, body, created_at) VALUES
('yDCqT5JYP4NuPz5ULyp1', 'iQlyANp6sZVztRrAeJGr', NULL, 'Automated Test Notice', 'Notice created by automated QA', '2026-01-24T18:01:25.580Z'::timestamptz);

-- 9. TASKS
INSERT INTO tasks (id, company_id, site_id, title, description, status, created_at) VALUES
('LjuQRKBF9VChCTvSUBEr', 'iQlyANp6sZVztRrAeJGr', NULL, 'Automated Test Task', 'Task created by automated QA', 'pending', '2026-01-24T18:01:25.497Z'::timestamptz);

-- 10. SETTINGS
INSERT INTO settings (id, company_id, display, updated_at) VALUES
('W1BARv21DgaxKN6vrYdzb5wMRaY2', 'test company ltd', '{"dateFormat":"DD/MM/YYYY","timeFormat":"24 Hour","language":"English (UK)","darkMode":false}'::jsonb, '2026-02-06T06:30:06.550Z'::timestamptz),
('steven_hukelight_yahoo_co_uk', 'test company ltd', '{"dateFormat":"DD/MM/YYYY","timeFormat":"24 Hour","language":"English (UK)","darkMode":true}'::jsonb, '2026-02-05T22:59:22.489Z'::timestamptz);

-- 11. REGISTRATIONS
INSERT INTO registrations (id, company_id, email, name, company_name, role, status, created_at, approved_at, rejected_at) VALUES
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
('znERWPIblek7QBtdDGUR', 'd7PSiaNXGt0oGv6SQKkZ', 'steve@wiltonelectrics.co.uk', 'Steven Light', 'Wilton Electrics Ltd', 'ADMIN', 'APPROVED', '2026-02-07T22:27:53.515Z'::timestamptz, '2026-02-07T22:34:41.420Z'::timestamptz, NULL);

-- 12. USER_PRE_INDUCTION_PROFILE (from users__preInductionProfile - personal + declarations)
INSERT INTO user_pre_induction_profile (id, user_id, firebase_uid, data) VALUES
('W1BARv21DgaxKN6vrYdzb5wMRaY2', NULL, 'W1BARv21DgaxKN6vrYdzb5wMRaY2', '{"personal":{"fullName":"Steven Huke-Light","dateOfBirth":"1983-07-04","phone":"07944054718","email":"steven_hukelight@yahoo.co.uk","address":"72 Wynford Way, Eltham, London\nSE9 3EE","emergencyContactName":"Katy Light","emergencyContactRelationship":"Wife","emergencyContactPhone":"07841346768","updatedAt":"2026-02-12T21:56:37.094Z"},"declarations":{"operativeDeclarationAccepted":true,"supervisorDeclarationAccepted":true,"operativeDeclarationAcceptedAt":"2026-02-12T21:57:23.033Z","supervisorDeclarationAcceptedAt":"2026-02-12T21:57:23.033Z","updatedAt":"2026-02-12T21:57:23.131Z"}}'::jsonb);
