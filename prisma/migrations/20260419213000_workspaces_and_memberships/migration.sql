-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Category" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Member" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "SavingsGoal" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Session" ADD COLUMN "activeWorkspaceId" TEXT;
ALTER TABLE "StarterCategory" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "workspaceId" TEXT;

-- Seed personal workspaces from existing users
INSERT INTO "Workspace" ("id", "name", "inviteCode", "currency", "locale", "createdAt", "updatedAt")
SELECT
    "User"."id",
    COALESCE("UserSettings"."appName", "User"."name"),
    UPPER(REPLACE("User"."id", '-', '')),
    COALESCE("UserSettings"."currency", 'PLN'),
    COALESCE("UserSettings"."locale", 'ru-RU'),
    COALESCE("UserSettings"."createdAt", "User"."createdAt", CURRENT_TIMESTAMP),
    CURRENT_TIMESTAMP
FROM "User"
LEFT JOIN "UserSettings" ON "UserSettings"."userId" = "User"."id";

INSERT INTO "WorkspaceMembership" ("id", "userId", "workspaceId", "role", "createdAt", "updatedAt")
SELECT
    CONCAT('membership_', "User"."id"),
    "User"."id",
    "User"."id",
    'OWNER',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User";

UPDATE "Member"
SET "workspaceId" = "userId";

UPDATE "Category"
SET "workspaceId" = "userId";

UPDATE "Transaction"
SET "workspaceId" = "userId";

UPDATE "Budget"
SET "workspaceId" = "userId";

UPDATE "SavingsGoal"
SET "workspaceId" = "userId";

UPDATE "Session"
SET "activeWorkspaceId" = "userId";

UPDATE "StarterCategory"
SET "workspaceId" = "UserSettings"."userId"
FROM "UserSettings"
WHERE "StarterCategory"."userSettingsId" = "UserSettings"."id";

-- Make new relations required
ALTER TABLE "Budget" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Member" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "SavingsGoal" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "StarterCategory" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Transaction" ALTER COLUMN "workspaceId" SET NOT NULL;

-- Replace uniqueness scoped to workspace
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_userId_name_key";
ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_userId_name_key";
ALTER TABLE "StarterCategory" DROP CONSTRAINT IF EXISTS "StarterCategory_userSettingsId_name_key";

ALTER TABLE "Category" ADD CONSTRAINT "Category_workspaceId_name_key" UNIQUE ("workspaceId", "name");
ALTER TABLE "Member" ADD CONSTRAINT "Member_workspaceId_name_key" UNIQUE ("workspaceId", "name");
ALTER TABLE "StarterCategory" ADD CONSTRAINT "StarterCategory_workspaceId_name_key" UNIQUE ("workspaceId", "name");

-- New indexes
CREATE UNIQUE INDEX "Workspace_inviteCode_key" ON "Workspace"("inviteCode");
CREATE UNIQUE INDEX "WorkspaceMembership_userId_workspaceId_key" ON "WorkspaceMembership"("userId", "workspaceId");
CREATE INDEX "WorkspaceMembership_userId_idx" ON "WorkspaceMembership"("userId");
CREATE INDEX "WorkspaceMembership_workspaceId_idx" ON "WorkspaceMembership"("workspaceId");
CREATE INDEX "Session_activeWorkspaceId_idx" ON "Session"("activeWorkspaceId");
CREATE INDEX "Member_workspaceId_idx" ON "Member"("workspaceId");
CREATE INDEX "Category_workspaceId_kind_idx" ON "Category"("workspaceId", "kind");
CREATE INDEX "Transaction_workspaceId_transactionDate_idx" ON "Transaction"("workspaceId", "transactionDate");
CREATE INDEX "Budget_workspaceId_startDate_endDate_idx" ON "Budget"("workspaceId", "startDate", "endDate");
CREATE INDEX "SavingsGoal_workspaceId_targetDate_idx" ON "SavingsGoal"("workspaceId", "targetDate");
CREATE INDEX "StarterCategory_workspaceId_sortOrder_idx" ON "StarterCategory"("workspaceId", "sortOrder");

-- Foreign keys
ALTER TABLE "Session"
ADD CONSTRAINT "Session_activeWorkspaceId_fkey"
FOREIGN KEY ("activeWorkspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkspaceMembership"
ADD CONSTRAINT "WorkspaceMembership_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceMembership"
ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Member"
ADD CONSTRAINT "Member_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Category"
ADD CONSTRAINT "Category_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Budget"
ADD CONSTRAINT "Budget_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavingsGoal"
ADD CONSTRAINT "SavingsGoal_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StarterCategory"
ADD CONSTRAINT "StarterCategory_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Retire user-bound settings in favor of workspace settings
ALTER TABLE "StarterCategory" DROP COLUMN "userSettingsId";
DROP TABLE "UserSettings";
