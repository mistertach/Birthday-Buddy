-- Make a user an admin
-- Replace 'your@email.com' with the actual email address

UPDATE "User" 
SET "isAdmin" = true 
WHERE email = 'your@email.com';

-- Verify the change
SELECT id, name, email, "isAdmin" 
FROM "User" 
WHERE email = 'your@email.com';
