/*
  Warnings:

  - You are about to drop the column `metadata` on the `Message` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cacheCreationInputTokens" INTEGER,
    "cacheReadInputTokens" INTEGER,
    "cost" REAL,
    "model" TEXT,
    "durationMs" INTEGER,
    "thinkingContent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Migrate data from metadata JSON to individual columns
INSERT INTO "new_Message" (
    "id",
    "sessionId",
    "role",
    "content",
    "toolCalls",
    "inputTokens",
    "outputTokens",
    "cacheCreationInputTokens",
    "cacheReadInputTokens",
    "cost",
    "model",
    "durationMs",
    "createdAt"
)
SELECT
    "id",
    "sessionId",
    "role",
    "content",
    "toolCalls",
    json_extract(metadata, '$.usage.input_tokens'),
    json_extract(metadata, '$.usage.output_tokens'),
    json_extract(metadata, '$.usage.cache_creation_input_tokens'),
    json_extract(metadata, '$.usage.cache_read_input_tokens'),
    json_extract(metadata, '$.cost'),
    json_extract(metadata, '$.model'),
    json_extract(metadata, '$.duration_ms'),
    "createdAt"
FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE INDEX "Message_sessionId_idx" ON "Message"("sessionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
