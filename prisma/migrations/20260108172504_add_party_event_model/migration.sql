-- CreateTable
CREATE TABLE "PartyEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" TEXT,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "giftStatus" TEXT NOT NULL DEFAULT 'NONE',
    "giftBudget" DOUBLE PRECISION,
    "giftNotes" TEXT,
    "rsvpStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartyEvent_userId_idx" ON "PartyEvent"("userId");

-- CreateIndex
CREATE INDEX "PartyEvent_contactId_idx" ON "PartyEvent"("contactId");

-- AddForeignKey
ALTER TABLE "PartyEvent" ADD CONSTRAINT "PartyEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyEvent" ADD CONSTRAINT "PartyEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
