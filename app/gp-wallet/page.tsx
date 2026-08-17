import { ArrowRightLeft, Coins, Wallet } from "lucide-react";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, Badge, Stat } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { getGpLedgerLabel, getGpTransferRecipients, getGpWallet } from "@/lib/data";
import { formatCurrencyValue } from "@/lib/warehouse";

function formatWalletDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default async function GpWalletPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; purchased?: string; error?: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const [wallet, recipients, params] = await Promise.all([
    getGpWallet(session.userId),
    getGpTransferRecipients(session.userId),
    searchParams,
  ]);

  const feedbackMessage =
    params.sent === "1"
      ? "GP transfer completed."
      : params.purchased === "1"
        ? "Warehouse item purchased with GP."
        : params.error === "amount"
          ? "Enter a valid GP amount."
          : params.error === "recipient"
            ? "Choose a valid recipient."
            : params.error === "balance"
              ? "Not enough GP balance for that action."
              : params.error === "same"
                ? "You cannot transfer GP to yourself."
                : params.error === "item"
                  ? "That warehouse item is no longer available for GP purchase."
                  : params.error === "currency"
                    ? "Only GP-priced items can be purchased from this flow."
                    : undefined;

  return (
    <Shell
      active="/gp-wallet"
      title="GP wallet"
      subtitle="Review your GP balance, transfer to guild members, and track recent spending."
    >
      <div className="space-y-6">
        <div className="grid gap-5 md:grid-cols-3">
          <Stat
            label="Available GP"
            value={formatCurrencyValue(wallet?.gpBalance ?? 0, "GP")}
            hint="Live wallet balance on your account"
          />
          <Stat label="Transfer recipients" value={recipients.length} hint="Approved guild accounts you can pay" />
          <Stat label="Recent entries" value={wallet?.gpLedgerEntries.length ?? 0} hint="Latest wallet movements" />
        </div>

        {feedbackMessage ? (
          <Card
            className={`p-4 ${params.error ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}
          >
            <div className={`text-sm font-semibold ${params.error ? "text-amber-700" : "text-emerald-700"}`}>
              {feedbackMessage}
            </div>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="p-6">
            <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <ArrowRightLeft size={18} />
              <span>Transfer GP</span>
            </div>
            <div className="mt-2 text-sm text-slate-500">
              Send GP directly to another approved guild account.
            </div>

            <form action="/api/gp/transfers" method="post" className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-600">Recipient</span>
                <select
                  name="recipientId"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  defaultValue=""
                  disabled={recipients.length === 0}
                >
                  <option value="" disabled>
                    {recipients.length === 0 ? "No approved members available yet" : "Select a member"}
                  </option>
                  {recipients.map((recipient) => (
                    <option key={recipient.id} value={recipient.id}>
                      {recipient.name} · @{recipient.discordHandle}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-slate-400">
                  {recipients.length === 0
                    ? "Another approved user account is needed before GP can be transferred."
                    : "Only approved guild accounts appear here."}
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-600">Amount</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  name="amount"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  placeholder="50000"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-600">Note</span>
                <textarea
                  name="note"
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  placeholder="Optional reason for the transfer"
                />
              </label>

              <button
                disabled={recipients.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                <Coins size={16} />
                <span>Send GP</span>
              </button>
            </form>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Wallet size={18} />
              <span>Recent activity</span>
            </div>
            <div className="mt-2 text-sm text-slate-500">
              Purchases, transfers, and admin balance adjustments on your account.
            </div>

            <div className="mt-5 space-y-3">
              {wallet?.gpLedgerEntries.length ? (
                wallet.gpLedgerEntries.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{getGpLedgerLabel(entry.type)}</div>
                        <div className="mt-1 text-xs text-slate-400">{formatWalletDate(entry.createdAt)}</div>
                      </div>
                      <Badge tone={entry.amount >= 0 ? "green" : "amber"}>
                        {entry.amount >= 0 ? "+" : "-"}
                        {formatCurrencyValue(Math.abs(entry.amount), "GP")}
                      </Badge>
                    </div>

                    <div className="mt-3 text-sm text-slate-600">
                      {entry.relatedUser ? (
                        <div>
                          Counterparty: <span className="font-medium text-slate-900">{entry.relatedUser.name}</span> · @
                          {entry.relatedUser.discordHandle}
                        </div>
                      ) : null}
                      {entry.warehouseItem ? (
                        <div>
                          Item: <span className="font-medium text-slate-900">{entry.warehouseItem.name}</span>
                        </div>
                      ) : null}
                      {entry.note ? <div>{entry.note}</div> : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  No GP activity yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
