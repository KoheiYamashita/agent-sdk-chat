-- CreateTable
CREATE TABLE "CustomModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "baseModel" TEXT NOT NULL,
    "systemPrompt" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "iconColor" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomModel_name_key" ON "CustomModel"("name");
