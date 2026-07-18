-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "remoteJid" TEXT;

-- CreateIndex
CREATE INDEX "Conversation_unitId_remoteJid_idx" ON "Conversation"("unitId", "remoteJid");
