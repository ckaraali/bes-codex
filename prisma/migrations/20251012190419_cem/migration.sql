-- CreateTable
CREATE TABLE "CommunicationCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "reasonsJson" TEXT NOT NULL,
    "scheduledAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommunicationCampaign_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommunicationRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunicationRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CommunicationCampaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommunicationChannelStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommunicationChannelStatus_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CommunicationCampaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CommunicationCampaign_ownerId_idx" ON "CommunicationCampaign"("ownerId");

-- CreateIndex
CREATE INDEX "CommunicationCampaign_scheduledAt_idx" ON "CommunicationCampaign"("scheduledAt");

-- CreateIndex
CREATE INDEX "CommunicationRecipient_campaignId_idx" ON "CommunicationRecipient"("campaignId");

-- CreateIndex
CREATE INDEX "CommunicationRecipient_clientId_idx" ON "CommunicationRecipient"("clientId");

-- CreateIndex
CREATE INDEX "CommunicationChannelStatus_campaignId_idx" ON "CommunicationChannelStatus"("campaignId");

-- CreateIndex
CREATE INDEX "CommunicationChannelStatus_channel_idx" ON "CommunicationChannelStatus"("channel");
