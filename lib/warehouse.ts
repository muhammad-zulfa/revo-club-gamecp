import { CurrencyUnit, WarehouseItemSource, WarehouseItemStatus } from "@prisma/client";

export const warehouseSourceOptions = [
  { value: WarehouseItemSource.PIT_BOSS, label: "Pit Boss loot" },
  { value: WarehouseItemSource.GUILD_SELLER, label: "Guild member sale" },
] as const;

export const warehouseStatusOptions = [
  { value: WarehouseItemStatus.STORED, label: "Stored" },
  { value: WarehouseItemStatus.LISTED, label: "Listed" },
  { value: WarehouseItemStatus.SOLD_EXTERNALLY, label: "Sold externally" },
  { value: WarehouseItemStatus.SOLD_TO_MEMBER, label: "Sold to member" },
  { value: WarehouseItemStatus.CANCELLED, label: "Cancelled" },
] as const;

export const currencyUnitOptions = [
  { value: CurrencyUnit.GP, label: "GP" },
  { value: CurrencyUnit.CASH_COIN, label: "Cash Coin" },
  { value: CurrencyUnit.IDR, label: "IDR" },
] as const;

export function getWarehouseSourceLabel(source: WarehouseItemSource) {
  return warehouseSourceOptions.find((option) => option.value === source)?.label ?? "Unknown";
}

export function getWarehouseStatusLabel(status: WarehouseItemStatus) {
  return warehouseStatusOptions.find((option) => option.value === status)?.label ?? "Unknown";
}

export function getWarehouseStatusTone(
  status: WarehouseItemStatus,
): "blue" | "green" | "amber" | "slate" {
  if (status === WarehouseItemStatus.SOLD_EXTERNALLY) return "green";
  if (status === WarehouseItemStatus.SOLD_TO_MEMBER) return "blue";
  if (status === WarehouseItemStatus.LISTED) return "amber";
  return "slate";
}

export function parseWarehouseSource(value: string) {
  return warehouseSourceOptions.some((option) => option.value === value)
    ? (value as WarehouseItemSource)
    : null;
}

export function parseWarehouseStatus(value: string) {
  return warehouseStatusOptions.some((option) => option.value === value)
    ? (value as WarehouseItemStatus)
    : null;
}

export function parseCurrencyUnit(value: string) {
  return currencyUnitOptions.some((option) => option.value === value)
    ? (value as CurrencyUnit)
    : null;
}

export function getCurrencyUnitLabel(unit: CurrencyUnit) {
  return currencyUnitOptions.find((option) => option.value === unit)?.label ?? unit;
}

export function formatCurrencyValue(value: number, unit: CurrencyUnit) {
  if (unit === CurrencyUnit.IDR) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (unit === CurrencyUnit.CASH_COIN) {
    return `${new Intl.NumberFormat("en-US").format(value)} Cash Coin`;
  }

  return `${new Intl.NumberFormat("en-US").format(value)} GP`;
}
