ALTER TABLE "AppConfig"
ADD COLUMN "warehouseMemberSaleFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "Event"
ADD COLUMN "attendanceMinutesRequired" INTEGER;
