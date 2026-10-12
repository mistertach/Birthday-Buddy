-- CreateTable
CREATE TABLE "MobileMagicLinkToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileMagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileMagicLinkToken_token_key" ON "MobileMagicLinkToken"("token");

-- CreateIndex
CREATE INDEX "MobileMagicLinkToken_userId_idx" ON "MobileMagicLinkToken"("userId");

-- CreateIndex
CREATE INDEX "MobileMagicLinkToken_token_idx" ON "MobileMagicLinkToken"("token");

-- AddForeignKey
ALTER TABLE "MobileMagicLinkToken" ADD CONSTRAINT "MobileMagicLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
