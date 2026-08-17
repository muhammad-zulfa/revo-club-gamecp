CREATE TYPE "CurrencyUnit" AS ENUM ('GP', 'CASH_COIN', 'IDR');

ALTER TABLE "WarehouseItem"
ADD COLUMN "askingPriceCurrency" "CurrencyUnit" NOT NULL DEFAULT 'GP',
ADD COLUMN "soldCurrency" "CurrencyUnit",
ADD COLUMN "creditedCurrency" "CurrencyUnit";
