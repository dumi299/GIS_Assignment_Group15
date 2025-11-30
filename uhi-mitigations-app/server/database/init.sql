-- Initialize database with a default user
-- This is a simple setup - in production, you'd want proper authentication

INSERT INTO users (id, username, email) 
VALUES ('00000000-0000-0000-0000-000000000000', 'default_user', 'user@example.com')
ON CONFLICT (id) DO NOTHING;

