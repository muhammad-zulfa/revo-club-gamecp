import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, Stat, Badge } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { getGuildCashSummary } from "@/lib/data";
import { formatCurrencyValue } from "@/lib/warehouse";

function formatGuildCashDate(value: Date | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export default async function GuildCashPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const summary = await getGuildCashSummary();

  return (
    <Shell
      active="/guild-cash"
      title="Guild cash"
      subtitle="Track external-sale credits in IDR or Cash Coin, plus the guild GP reserve and total GP distributed to members."
    >
      <div className="space-y-6">
        <div className="grid gap-5 md:grid-cols-4">
          <Stat label="IDR credited" value={formatCurrencyValue(summary.idr, "IDR")} />
          <Stat label="Cash Coin credited" value={formatCurrencyValue(summary.cashCoin, "CASH_COIN")} />
          <Stat label="Guild GP balance" value={formatCurrencyValue(summary.guildGpBalance, "GP")} />
          <Stat label="Total GP distributed" value={formatCurrencyValue(summary.gpDistributed, "GP")} />
        </div>

        <Card className="overflow-hidden">
          <div className="grid grid-cols-[1.4fr_.8fr_.8fr_.8fr_.8fr] gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">
            <div>Item</div>
            <div>Status</div>
            <div>Sold amount</div>
            <div>Guild cash credited</div>
            <div>Date</div>
          </div>

          {summary.entries.length ? (
            summary.entries.map((entry, index) => (
              <div
                key={`${entry.name}-${index}`}
                className="grid grid-cols-[1.4fr_.8fr_.8fr_.8fr_.8fr] gap-4 border-b border-slate-100 px-6 py-4 text-sm text-slate-600 last:border-0"
              >
                <div>
                  <div className="font-semibold text-slate-900">{entry.name}</div>
                </div>
                <div>
                  <Badge tone={entry.status === "SOLD_EXTERNALLY" ? "green" : "blue"}>
                    {entry.status === "SOLD_EXTERNALLY" ? "External sale" : "GP distributed"}
                  </Badge>
                </div>
                <div>
                  {entry.soldAmount !== null && entry.soldCurrency
                    ? formatCurrencyValue(entry.soldAmount, entry.soldCurrency)
                    : "Not set"}
                </div>
                <div>
                  {entry.creditedAmount !== null && entry.creditedCurrency
                    ? formatCurrencyValue(entry.creditedAmount, entry.creditedCurrency)
                    : "Not credited"}
                </div>
                <div>
                  {formatGuildCashDate(entry.creditedAt ?? entry.soldAt)}
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              No guild cash movements recorded yet.
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
}
