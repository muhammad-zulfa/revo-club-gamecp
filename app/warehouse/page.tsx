import { UserRole } from "@prisma/client";
import Link from "next/link";
import { Archive, Coins, Plus, X } from "lucide-react";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, Stat, Badge } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { getPitBossEventsForWarehouse, getUserGpBalance, getWarehouseItems, getWarehouseSummary } from "@/lib/data";
import {
  currencyUnitOptions,
  formatCurrencyValue,
  getWarehouseSourceLabel,
  getWarehouseStatusLabel,
  getWarehouseStatusTone,
  warehouseSourceOptions,
  warehouseStatusOptions,
} from "@/lib/warehouse";

function formatWarehouseDate(value: Date | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default async function WarehousePage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    updated?: string;
    bought?: string;
    error?: string;
    panel?: string;
  }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const isAdmin = session.role === UserRole.ADMIN;
  const panel = params.panel === "create" ? "create" : null;
  const [items, summary, pitBossEvents, gpBalance] = await Promise.all([
    getWarehouseItems(),
    getWarehouseSummary(),
    getPitBossEventsForWarehouse(),
    getUserGpBalance(session.userId),
  ]);

  const feedbackMessage =
    params.saved === "1"
      ? "Warehouse item added."
      : params.updated === "1"
        ? "Warehouse item updated."
        : params.bought === "1"
          ? "Warehouse item purchased with GP."
        : params.error === "missing"
          ? "Fill in name, picture, price, and source."
          : params.error === "image"
            ? "Add an image URL or upload a picture for the item."
            : params.error === "event"
              ? "Pit Boss loot must be linked to its source event."
              : params.error === "status"
                ? "Choose a valid warehouse status."
                : params.error === "balance"
                  ? "Not enough GP balance for that purchase."
                  : params.error === "item"
                    ? "That warehouse item is no longer available."
                    : params.error === "currency"
                      ? "Only GP-priced items can be purchased from the warehouse."
                : undefined;

  return (
    <Shell
      active="/warehouse"
      title="Warehouse"
      subtitle="Track Pit Boss drops and guild sale inventory with source events, status, and pricing."
      action={
        session ? (
          <Link
            href="/warehouse?panel=create"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus size={16} />
            <span>Add item</span>
          </Link>
        ) : null
      }
    >
      <div className={`grid gap-6 ${panel ? "xl:grid-cols-[1.55fr_.95fr]" : ""}`}>
        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-4">
            <Stat label="Your GP balance" value={formatCurrencyValue(gpBalance, "GP")} />
            <Stat label="Pit Boss drops" value={summary.pbItems} />
            <Stat label="Listed items" value={summary.listedItems} />
            <Stat label="Sold externally" value={summary.externallySold} />
          </div>

          {feedbackMessage ? (
            <Card
              className={`p-4 ${params.error ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}
            >
              <div
                className={`text-sm font-semibold ${params.error ? "text-amber-700" : "text-emerald-700"}`}
              >
                {feedbackMessage}
              </div>
            </Card>
          ) : null}

          <div className="grid gap-4">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                  <div className="bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full min-h-[180px] w-full object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xl font-bold text-slate-900">{item.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge tone={getWarehouseStatusTone(item.status)}>
                            {getWarehouseStatusLabel(item.status)}
                          </Badge>
                          <span className="text-sm text-slate-500">
                            {getWarehouseSourceLabel(item.source)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">
                          Asking price
                        </div>
                        <div className="mt-1 text-xl font-bold text-slate-900">
                          {formatCurrencyValue(item.askingPrice, item.askingPriceCurrency)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                      <div>
                        <div className="font-semibold text-slate-900">Linked event</div>
                        <div>
                          {item.event
                            ? `${item.event.title} · ${formatWarehouseDate(item.event.startAt)}`
                            : "No event linked"}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Guild seller</div>
                        <div>{item.sellerName || "Not specified"}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Sold amount</div>
                        <div>
                          {item.soldAmount !== null && item.soldCurrency
                            ? formatCurrencyValue(item.soldAmount, item.soldCurrency)
                            : "Not sold yet"}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Guild cash credited</div>
                        <div>
                          {item.creditedAmount !== null && item.creditedCurrency
                            ? formatCurrencyValue(item.creditedAmount, item.creditedCurrency)
                            : "Not credited yet"}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Sold to</div>
                        <div>{item.soldTo || "Not specified"}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Sold on</div>
                        <div>{formatWarehouseDate(item.soldAt)}</div>
                      </div>
                    </div>

                    {item.notes ? (
                      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        {item.notes}
                      </div>
                    ) : null}

                    {item.askingPriceCurrency === "GP" &&
                    (item.status === "STORED" || item.status === "LISTED") ? (
                      <form action={`/api/warehouse/${item.id}/buy`} method="post" className="mt-5">
                        <input type="hidden" name="redirectTo" value="/warehouse" />
                        <button
                          disabled={gpBalance < item.askingPrice}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                        >
                          <Coins size={16} />
                          <span>
                            {gpBalance >= item.askingPrice ? "Buy with GP" : "Not enough GP"}
                          </span>
                        </button>
                      </form>
                    ) : null}

                    {isAdmin ? (
                      <form
                        action={`/api/admin/warehouse/${item.id}/update`}
                        method="post"
                        className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2"
                      >
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[.12em] text-slate-400">
                            Status
                          </span>
                          <select
                            name="status"
                            defaultValue={item.status}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                          >
                            {warehouseStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[.12em] text-slate-400">
                            Sold amount
                          </span>
                          <div className="grid gap-3 md:grid-cols-[1fr_150px]">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              name="soldAmount"
                              defaultValue={item.soldAmount ?? ""}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                            />
                            <select
                              name="soldCurrency"
                              defaultValue={item.soldCurrency ?? "GP"}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                            >
                              {currencyUnitOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[.12em] text-slate-400">
                            Credited to guild cash
                          </span>
                          <div className="grid gap-3 md:grid-cols-[1fr_150px]">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              name="creditedAmount"
                              defaultValue={item.creditedAmount ?? ""}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                            />
                            <select
                              name="creditedCurrency"
                              defaultValue={item.creditedCurrency ?? "IDR"}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                            >
                              {currencyUnitOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[.12em] text-slate-400">
                            Sold to
                          </span>
                          <input
                            name="soldTo"
                            defaultValue={item.soldTo ?? ""}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                          />
                        </label>
                        <label className="block md:col-span-2">
                          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[.12em] text-slate-400">
                            Notes
                          </span>
                          <textarea
                            name="notes"
                            rows={3}
                            defaultValue={item.notes ?? ""}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                          />
                        </label>
                        <button className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100 md:col-span-2 md:justify-self-start">
                          Update item
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {panel ? (
          <div className="min-h-0">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Archive size={18} />
                  <span>Add warehouse item</span>
                </div>
                <Link
                  href="/warehouse"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                >
                  <X size={16} />
                </Link>
              </div>

              <form
                action="/api/admin/warehouse/create"
                method="post"
                encType="multipart/form-data"
                className="space-y-4"
              >
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">Item name</span>
                  <input
                    name="name"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">Source</span>
                  <select
                    name="source"
                    defaultValue={warehouseSourceOptions[0].value}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    {warehouseSourceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">Picture upload</span>
                  <input
                    type="file"
                    name="imageFile"
                    accept="image/*"
                    className="block w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">Or picture URL</span>
                  <input
                    name="imageUrl"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">Asking price</span>
                  <div className="grid gap-3 md:grid-cols-[1fr_150px]">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="askingPrice"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    />
                    <select
                      name="askingPriceCurrency"
                      defaultValue="GP"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                    >
                      {currencyUnitOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">Linked Pit Boss event</span>
                  <select
                    name="eventId"
                    defaultValue=""
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="">No event linked</option>
                    {pitBossEvents.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title} · {formatWarehouseDate(event.startAt)}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs text-slate-400">
                    Required for Pit Boss loot so the drop stays linked to the source event.
                  </span>
                </label>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-sm font-medium text-slate-600">Guild seller</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    {session.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Automatically taken from the logged-in account when the item source is guild member sale.
                  </div>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-600">Notes</span>
                  <textarea
                    name="notes"
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </label>
                <button className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-700">
                  Save item
                </button>
              </form>
            </Card>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
