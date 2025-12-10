-- CreateTable
CREATE TABLE "ContactShare" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "sharedContactIds" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactShare_recipientId_status_idx" ON "ContactShare"("recipientId", "status");

-- AddForeignKey
ALTER TABLE "ContactShare" ADD CONSTRAINT "ContactShare_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactShare" ADD CONSTRAINT "ContactShare_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
