import { getDiscordSettings } from "@/lib/settings";

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  return withProtocol.replace(/\/+$/, "");
}

export async function getAppBaseUrl(fallback?: string) {
  const settings = await getDiscordSettings();
  const configured = normalizeBaseUrl(settings.appBaseUrl);

  if (configured) {
    return configured;
  }

  return normalizeBaseUrl(
    fallback ??
      process.env.APP_BASE_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000",
  );
}
