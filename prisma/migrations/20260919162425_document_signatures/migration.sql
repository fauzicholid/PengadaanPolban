-- AlterTable
ALTER TABLE "stage_documents" ADD COLUMN     "content_html" TEXT,
ADD COLUMN     "is_generated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "document_signatures" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "signer_role" TEXT NOT NULL,
    "signer_user_id" TEXT,
    "signer_vendor_id" TEXT,
    "signer_name" TEXT NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verification_code" TEXT NOT NULL,
    "signature_hash" TEXT NOT NULL,

    CONSTRAINT "document_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_signatures_verification_code_key" ON "document_signatures"("verification_code");

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "stage_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_signer_user_id_fkey" FOREIGN KEY ("signer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_signer_vendor_id_fkey" FOREIGN KEY ("signer_vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
