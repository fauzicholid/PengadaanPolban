-- AlterEnum
ALTER TYPE "StageStatus" ADD VALUE 'WAITING_ACCEPTANCE';

-- AlterTable
ALTER TABLE "procurement_packages" ADD COLUMN     "procurement_method" TEXT;
