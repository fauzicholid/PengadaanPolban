-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('ADMIN', 'KPA', 'PPK', 'STAF_PPK', 'PEJABAT_PENGADAAN', 'SPI', 'PENYEDIA');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'UPLOADED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'FINAL');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('DRAFT', 'RUP', 'PERSIAPAN', 'REVIU', 'PEMILIHAN', 'EVALUASI', 'NEGOSIASI', 'KONTRAK', 'PELAKSANAAN', 'SERAH_TERIMA', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StageCode" AS ENUM ('RUP', 'PERSIAPAN', 'REVIU', 'PEMILIHAN', 'EVALUASI', 'NEGOSIASI', 'KONTRAK', 'PELAKSANAAN', 'BAST');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'WAITING_DOCUMENT', 'WAITING_APPROVAL', 'REVISION', 'DUE_SOON', 'OVERDUE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REVISION', 'REJECTED');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ADMINISTRATION_PASSED', 'ADMINISTRATION_FAILED', 'TECHNICAL_PASSED', 'TECHNICAL_FAILED', 'PRICE_EVALUATED', 'WINNER', 'LOSER', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ADDENDUM', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "SpiRequestType" AS ENUM ('REQUEST', 'RISK_BASED');

-- CreateEnum
CREATE TYPE "SpiReviewStatus" AS ENUM ('NOT_REVIEWED', 'UNDER_REVIEW', 'CLARIFICATION', 'FOLLOW_UP_REQUIRED', 'FOLLOW_UP_PROCESS', 'FOLLOW_UP_VERIFICATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('FOLLOW_UP_REQUIRED', 'FOLLOW_UP_PROCESS', 'FOLLOW_UP_VERIFICATION', 'RESOLVED', 'REVISION');

-- CreateEnum
CREATE TYPE "FollowupVerification" AS ENUM ('WAITING_VERIFICATION', 'VERIFIED', 'REVISION');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('VENDOR_VERIFICATION', 'DOCUMENT_EXPIRING', 'PACKAGE_SUBMITTED', 'PACKAGE_RETURNED', 'PACKAGE_APPROVED', 'DOCUMENT_MISSING', 'DEADLINE_APPROACHING', 'DEADLINE_OVERDUE', 'REVIEW_REQUEST', 'SPI_FINDING', 'FOLLOWUP_DUE', 'CONTRACT_ENDING', 'GENERAL');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_units" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "work_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "code" "RoleCode" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "work_unit_id" TEXT NOT NULL,
    "sk_number" TEXT,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "nib" TEXT NOT NULL,
    "npwp" TEXT,
    "company_name" TEXT NOT NULL,
    "company_type" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "director_name" TEXT,
    "verification_status" "VendorStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_users" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "vendor_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kbli_master" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "kbli_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_kbli" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "kbli_id" TEXT NOT NULL,
    "license_status" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vendor_kbli_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_legal_documents" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_number" TEXT,
    "issued_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "file_uri" TEXT NOT NULL,
    "checksum" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "uploaded_by" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_verifications" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "verifier_id" TEXT,
    "decision" "VendorStatus" NOT NULL,
    "notes" TEXT,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rup" (
    "id" TEXT NOT NULL,
    "work_unit_id" TEXT NOT NULL,
    "external_rup_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "package_name" TEXT NOT NULL,
    "procurement_type" TEXT,
    "procurement_method" TEXT,
    "budget_ceiling" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "source_fund" TEXT,
    "location" TEXT,
    "volume" TEXT,
    "schedule" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL_IMPORT',
    "sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_packages" (
    "id" TEXT NOT NULL,
    "rup_id" TEXT NOT NULL,
    "package_code" TEXT NOT NULL,
    "ppk_user_id" TEXT NOT NULL,
    "package_name" TEXT NOT NULL,
    "procurement_type" TEXT,
    "status" "PackageStatus" NOT NULL DEFAULT 'DRAFT',
    "progress_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "budget_ceiling" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "hps_value" DECIMAL(18,2),
    "contract_value" DECIMAL(18,2),
    "kak_summary" TEXT,
    "specification" TEXT,
    "contract_draft" TEXT,
    "requirements" TEXT,
    "schedule_notes" TEXT,
    "cancelled_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_kbli" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "kbli_code" TEXT NOT NULL,

    CONSTRAINT "package_kbli_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_stages" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "stage_code" "StageCode" NOT NULL,
    "stage_name" TEXT NOT NULL,
    "sequence_no" INTEGER NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" "StageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "pic_user_id" TEXT,
    "start_at" TIMESTAMP(3),
    "target_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "package_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_documents" (
    "id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "file_uri" TEXT,
    "checksum" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "uploaded_by" TEXT,
    "uploaded_at" TIMESTAMP(3),

    CONSTRAINT "stage_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_approvals" (
    "id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "approver_user_id" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "notes" TEXT,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_invitations" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline_at" TIMESTAMP(3),
    "responded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "procurement_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "offered_value" DECIMAL(18,2),
    "status" "BidStatus" NOT NULL DEFAULT 'DRAFT',
    "admin_notes" TEXT,
    "technical_notes" TEXT,
    "technical_score" DECIMAL(5,2),
    "submitted_at" TIMESTAMP(3),

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "bid_id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "notes" TEXT,
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "contract_number" TEXT NOT NULL,
    "contract_value" DECIMAL(18,2) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_milestones" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_date" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "progress_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "contract_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_addenda" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "changes" TEXT NOT NULL,
    "new_value" DECIMAL(18,2),
    "new_end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_addenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spi_review_requests" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "request_type" "SpiRequestType" NOT NULL,
    "reason" TEXT,
    "scope" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spi_review_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spi_reviews" (
    "id" TEXT NOT NULL,
    "review_request_id" TEXT NOT NULL,
    "reviewer_user_id" TEXT NOT NULL,
    "review_status" "SpiReviewStatus" NOT NULL DEFAULT 'NOT_REVIEWED',
    "risk_level" "RiskLevel",
    "risk_score" INTEGER,
    "risk_reasons" TEXT,
    "started_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "spi_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spi_findings" (
    "id" TEXT NOT NULL,
    "spi_review_id" TEXT NOT NULL,
    "pic_user_id" TEXT,
    "category" TEXT,
    "description" TEXT NOT NULL,
    "due_date" TIMESTAMP(3),
    "status" "FindingStatus" NOT NULL DEFAULT 'FOLLOW_UP_REQUIRED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spi_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spi_followups" (
    "id" TEXT NOT NULL,
    "finding_id" TEXT NOT NULL,
    "submitted_by" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "evidence_uri" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verification_status" "FollowupVerification" NOT NULL DEFAULT 'WAITING_VERIFICATION',
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "verification_notes" TEXT,

    CONSTRAINT "spi_followups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "action" TEXT NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_logs" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "work_units_organization_id_code_key" ON "work_units"("organization_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_nib_key" ON "vendors"("nib");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_users_vendor_id_user_id_key" ON "vendor_users"("vendor_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "kbli_master_code_version_key" ON "kbli_master"("code", "version");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_kbli_vendor_id_kbli_id_key" ON "vendor_kbli"("vendor_id", "kbli_id");

-- CreateIndex
CREATE UNIQUE INDEX "rup_external_rup_id_fiscal_year_key" ON "rup"("external_rup_id", "fiscal_year");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_packages_package_code_key" ON "procurement_packages"("package_code");

-- CreateIndex
CREATE UNIQUE INDEX "package_stages_package_id_stage_code_key" ON "package_stages"("package_id", "stage_code");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_invitations_package_id_vendor_id_key" ON "procurement_invitations"("package_id", "vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "bids_package_id_vendor_id_key" ON "bids"("package_id", "vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_package_id_key" ON "contracts"("package_id");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contract_number_key" ON "contracts"("contract_number");

-- CreateIndex
CREATE UNIQUE INDEX "spi_reviews_review_request_id_key" ON "spi_reviews"("review_request_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- AddForeignKey
ALTER TABLE "work_units" ADD CONSTRAINT "work_units_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_units" ADD CONSTRAINT "work_units_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "work_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_work_unit_id_fkey" FOREIGN KEY ("work_unit_id") REFERENCES "work_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_users" ADD CONSTRAINT "vendor_users_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_users" ADD CONSTRAINT "vendor_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_kbli" ADD CONSTRAINT "vendor_kbli_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_kbli" ADD CONSTRAINT "vendor_kbli_kbli_id_fkey" FOREIGN KEY ("kbli_id") REFERENCES "kbli_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_legal_documents" ADD CONSTRAINT "vendor_legal_documents_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_legal_documents" ADD CONSTRAINT "vendor_legal_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_verifications" ADD CONSTRAINT "vendor_verifications_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_verifications" ADD CONSTRAINT "vendor_verifications_verifier_id_fkey" FOREIGN KEY ("verifier_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rup" ADD CONSTRAINT "rup_work_unit_id_fkey" FOREIGN KEY ("work_unit_id") REFERENCES "work_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_packages" ADD CONSTRAINT "procurement_packages_rup_id_fkey" FOREIGN KEY ("rup_id") REFERENCES "rup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_packages" ADD CONSTRAINT "procurement_packages_ppk_user_id_fkey" FOREIGN KEY ("ppk_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_kbli" ADD CONSTRAINT "package_kbli_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "procurement_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_stages" ADD CONSTRAINT "package_stages_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "procurement_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_stages" ADD CONSTRAINT "package_stages_pic_user_id_fkey" FOREIGN KEY ("pic_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_documents" ADD CONSTRAINT "stage_documents_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "package_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_documents" ADD CONSTRAINT "stage_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_approvals" ADD CONSTRAINT "stage_approvals_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "package_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_approvals" ADD CONSTRAINT "stage_approvals_approver_user_id_fkey" FOREIGN KEY ("approver_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_invitations" ADD CONSTRAINT "procurement_invitations_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "procurement_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_invitations" ADD CONSTRAINT "procurement_invitations_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "procurement_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "bids"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "procurement_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_milestones" ADD CONSTRAINT "contract_milestones_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_addenda" ADD CONSTRAINT "contract_addenda_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spi_review_requests" ADD CONSTRAINT "spi_review_requests_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "procurement_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spi_review_requests" ADD CONSTRAINT "spi_review_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spi_reviews" ADD CONSTRAINT "spi_reviews_review_request_id_fkey" FOREIGN KEY ("review_request_id") REFERENCES "spi_review_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spi_reviews" ADD CONSTRAINT "spi_reviews_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spi_findings" ADD CONSTRAINT "spi_findings_spi_review_id_fkey" FOREIGN KEY ("spi_review_id") REFERENCES "spi_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spi_findings" ADD CONSTRAINT "spi_findings_pic_user_id_fkey" FOREIGN KEY ("pic_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spi_followups" ADD CONSTRAINT "spi_followups_finding_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "spi_findings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spi_followups" ADD CONSTRAINT "spi_followups_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spi_followups" ADD CONSTRAINT "spi_followups_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
