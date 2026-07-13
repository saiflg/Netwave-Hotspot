-- Blue Dot Networks — Router Reconnection Tracking
-- Adds state fields so the backend can track disconnect/reconnect events

ALTER TABLE "Router" ADD COLUMN IF NOT EXISTS "offlineSince"          TIMESTAMP;
ALTER TABLE "Router" ADD COLUMN IF NOT EXISTS "reconnectAttempts"     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Router" ADD COLUMN IF NOT EXISTS "lastDisconnectReason"  TEXT;
