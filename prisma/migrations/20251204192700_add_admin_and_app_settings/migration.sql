-- Add admin flag and notification preference to users
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "wantsEmailNotifications" BOOLEAN NOT NULL DEFAULT true;

-- Create shared AppSettings table for Resend configuration
CREATE TABLE IF NOT EXISTS "AppSettings" (
    "id" INTEGER PRIMARY KEY,
    "resendApiKey" TEXT,
    "resendFromEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ensure singleton row gets updated timestamp on change
CREATE OR REPLACE FUNCTION update_appsettings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS appsettings_set_timestamp ON "AppSettings";
CREATE TRIGGER appsettings_set_timestamp
BEFORE UPDATE ON "AppSettings"
FOR EACH ROW
EXECUTE PROCEDURE update_appsettings_updated_at();
