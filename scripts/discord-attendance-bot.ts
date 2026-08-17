import { existsSync } from "node:fs";
import WebSocket from "ws";
import { getConfiguredAttendanceMinutes, markAttendanceDmSent, recordAttendanceJoin, recordAttendanceLeave, refreshActiveEventAttendances } from "@/lib/event-attendance";
import { sendDiscordAttendancePrompt } from "@/lib/discord";
import { dispatchDueEventReminders } from "@/lib/event-reminders";
import { getDiscordSettings } from "@/lib/settings";

type GatewayHelloPayload = {
  op: 10;
  s?: number | null;
  d: {
    heartbeat_interval: number;
  };
};

type GatewayReadyPayload = {
  op: 0;
  t: "READY";
  s: number;
  d: {
    session_id: string;
    resume_gateway_url: string;
    user?: {
      id: string;
    };
  };
};

type GatewayGuildCreatePayload = {
  op: 0;
  t: "GUILD_CREATE";
  s: number;
  d: {
    id: string;
    voice_states?: DiscordVoiceState[];
  };
};

type GatewayVoiceStatePayload = {
  op: 0;
  t: "VOICE_STATE_UPDATE";
  s: number;
  d: DiscordVoiceState;
};

type DiscordVoiceState = {
  guild_id?: string;
  user_id: string;
  channel_id?: string | null;
  member?: {
    user?: {
      id: string;
      username?: string;
      global_name?: string | null;
    };
  };
};

type GatewayPacket =
  | GatewayHelloPayload
  | GatewayReadyPayload
  | GatewayGuildCreatePayload
  | GatewayVoiceStatePayload
  | {
      op: number;
      t?: string | null;
      s?: number | null;
      d?: unknown;
    };

const GUILDS_INTENT = 1 << 0;
const GUILD_VOICE_STATES_INTENT = 1 << 7;
const FATAL_CLOSE_CODES = new Set([4004, 4010, 4011, 4012, 4013, 4014]);

function loadLocalEnv() {
  const maybeLoadEnv = (process as typeof process & {
    loadEnvFile?: (path?: string) => void;
  }).loadEnvFile;

  for (const path of [".env", ".env.local"]) {
    if (existsSync(path)) {
      maybeLoadEnv?.(path);
    }
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class DiscordAttendanceBot {
  private ws: WebSocket | null = null;
  private gatewayUrl = "";
  private resumeGatewayUrl = "";
  private sessionId = "";
  private sequence: number | null = null;
  private heartbeatIntervalMs = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatAcked = true;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private maintenanceTimer: ReturnType<typeof setInterval> | null = null;
  private voiceStateCache = new Map<string, string | null>();
  private botUserId = "";

  async start() {
    loadLocalEnv();

    const settings = await getDiscordSettings();

    if (!settings.discordBotToken || !settings.discordGuildId) {
      throw new Error("Discord bot token or guild ID is missing from settings.");
    }

    this.startMaintenanceLoop();
    await this.connect(false);
  }

  stop() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.maintenanceTimer) clearInterval(this.maintenanceTimer);
    this.ws?.close();
  }

  private async connect(allowResume: boolean) {
    const settings = await getDiscordSettings();

    if (!this.gatewayUrl) {
      const response = await fetch("https://discord.com/api/gateway/bot", {
        headers: {
          Authorization: `Bot ${settings.discordBotToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord gateway fetch failed (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as { url: string };
      this.gatewayUrl = data.url;
    }

    const baseUrl =
      allowResume && this.resumeGatewayUrl ? this.resumeGatewayUrl : this.gatewayUrl;
    const gatewayUrl = new URL(baseUrl);
    gatewayUrl.searchParams.set("v", "10");
    gatewayUrl.searchParams.set("encoding", "json");

    this.ws = new WebSocket(gatewayUrl.toString());

    this.ws.on("open", () => {
      console.log("[attendance-bot] gateway connected");
    });

    this.ws.on("message", (data) => {
      void this.handleMessage(data);
    });

    this.ws.on("close", (code, reason) => {
      console.error("[attendance-bot] gateway closed", code, reason.toString() || "");
      this.cleanupSocket();

      if (FATAL_CLOSE_CODES.has(code)) {
        console.error("[attendance-bot] fatal close code, stopping bot");
        process.exitCode = 1;
        return;
      }

      this.scheduleReconnect(!FATAL_CLOSE_CODES.has(code));
    });

    this.ws.on("error", (event) => {
      console.error("[attendance-bot] gateway error", event);
    });
  }

  private cleanupSocket() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    this.heartbeatAcked = true;
    this.ws = null;
  }

  private scheduleReconnect(allowResume: boolean) {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.reconnectTimer = setTimeout(() => {
      void this.connect(allowResume).catch((error) => {
        console.error("[attendance-bot] reconnect failed", error);
        this.scheduleReconnect(false);
      });
    }, 3000);
  }

  private async handleMessage(rawData: unknown) {
    const text =
      typeof rawData === "string"
        ? rawData
        : Buffer.isBuffer(rawData)
          ? rawData.toString("utf8")
          : rawData instanceof ArrayBuffer
            ? Buffer.from(rawData).toString("utf8")
            : Array.isArray(rawData)
              ? Buffer.concat(rawData).toString("utf8")
              : "";

    if (!text) {
      return;
    }

    const packet = JSON.parse(text) as GatewayPacket;

    if (typeof packet.s === "number") {
      this.sequence = packet.s;
    }

    switch (packet.op) {
      case 10:
        this.heartbeatIntervalMs = (packet as GatewayHelloPayload).d.heartbeat_interval;
        this.startHeartbeatLoop();
        await this.identifyOrResume();
        return;
      case 11:
        this.heartbeatAcked = true;
        return;
      case 1:
        this.sendHeartbeat();
        return;
      case 7:
        console.log("[attendance-bot] gateway requested reconnect");
        this.ws?.close();
        return;
      default:
        break;
    }

    if (packet.op !== 0 || !packet.t) {
      return;
    }

    if (packet.t === "READY") {
      const readyPacket = packet as GatewayReadyPayload;
      this.sessionId = readyPacket.d.session_id;
      this.resumeGatewayUrl = readyPacket.d.resume_gateway_url;
      this.botUserId = readyPacket.d.user?.id ?? "";
      console.log("[attendance-bot] ready");
      return;
    }

    if (packet.t === "GUILD_CREATE") {
      const guildCreatePacket = packet as GatewayGuildCreatePayload;

      for (const voiceState of guildCreatePacket.d.voice_states ?? []) {
        await this.processVoiceState(voiceState, true);
      }
      return;
    }

    if (packet.t === "VOICE_STATE_UPDATE") {
      await this.processVoiceState((packet as GatewayVoiceStatePayload).d, false);
    }
  }

  private startHeartbeatLoop() {
    if (!this.heartbeatIntervalMs) {
      return;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    const firstDelay = Math.max(
      1000,
      Math.floor(Math.random() * this.heartbeatIntervalMs),
    );

    void (async () => {
      await wait(firstDelay);
      this.sendHeartbeat();

      this.heartbeatTimer = setInterval(() => {
        this.sendHeartbeat();
      }, this.heartbeatIntervalMs);
    })();
  }

  private sendHeartbeat() {
    if (!this.ws) {
      return;
    }

    if (!this.heartbeatAcked) {
      console.error("[attendance-bot] missed heartbeat ack, reconnecting");
      this.ws.close();
      return;
    }

    this.heartbeatAcked = false;
    this.send({
      op: 1,
      d: this.sequence,
    });
  }

  private async identifyOrResume() {
    const settings = await getDiscordSettings();

    if (this.sessionId && this.sequence !== null) {
      this.send({
        op: 6,
        d: {
          token: settings.discordBotToken,
          session_id: this.sessionId,
          seq: this.sequence,
        },
      });
      return;
    }

    this.send({
      op: 2,
      d: {
        token: settings.discordBotToken,
        intents: GUILDS_INTENT | GUILD_VOICE_STATES_INTENT,
        properties: {
          os: process.platform,
          browser: "rf-guild-crm",
          device: "rf-guild-crm",
        },
      },
    });
  }

  private send(payload: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(JSON.stringify(payload));
  }

  private async processVoiceState(
    voiceState: DiscordVoiceState,
    fromGuildCreate: boolean,
  ) {
    const settings = await getDiscordSettings();
    const guildId = voiceState.guild_id ?? settings.discordGuildId;

    if (settings.discordGuildId && guildId !== settings.discordGuildId) {
      return;
    }

    if (!voiceState.user_id || voiceState.user_id === this.botUserId) {
      return;
    }

    const cacheKey = `${guildId}:${voiceState.user_id}`;
    const previousChannelId = this.voiceStateCache.get(cacheKey) ?? null;
    const nextChannelId = voiceState.channel_id ?? null;

    if (!fromGuildCreate && previousChannelId === nextChannelId) {
      return;
    }

    if (previousChannelId && previousChannelId !== nextChannelId) {
      await recordAttendanceLeave({
        discordId: voiceState.user_id,
        previousVoiceChannelId: previousChannelId,
        leftAt: new Date(),
      }).catch((error) => {
        console.error("[attendance-bot] attendance leave failed", error);
      });
    }

    if (nextChannelId) {
      const discordHandle =
        voiceState.member?.user?.global_name ||
        voiceState.member?.user?.username ||
        null;

      const result = await recordAttendanceJoin({
        discordId: voiceState.user_id,
        discordHandle,
        voiceChannelId: nextChannelId,
        joinedAt: new Date(),
      }).catch((error) => {
        console.error("[attendance-bot] attendance join failed", error);
        return null;
      });

      if (result?.attendance && result.event && result.shouldSendDm) {
        const attendanceMinutes = await getConfiguredAttendanceMinutes();

        try {
          const sent = await sendDiscordAttendancePrompt({
            discordId: voiceState.user_id,
            attendanceId: result.attendance.id,
            eventTitle: result.event.title,
            startAt: result.event.startAt,
            endAt: result.event.endAt,
            attendanceMinutes,
          });

          if (sent) {
            await markAttendanceDmSent(result.attendance.id, new Date());
          }
        } catch (error) {
          console.error("[attendance-bot] attendance DM failed", {
            attendanceId: result.attendance.id,
            eventId: result.event.id,
            error,
          });
        }
      }
    }

    this.voiceStateCache.set(cacheKey, nextChannelId);
  }

  private startMaintenanceLoop() {
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
    }

    void dispatchDueEventReminders(new Date())
      .then((result) => {
        if (result.sent || result.failed) {
          console.log("[attendance-bot] initial reminder dispatch", result);
        }
      })
      .catch((error) => {
        console.error("[attendance-bot] initial reminder dispatch failed", error);
      });

    void refreshActiveEventAttendances(new Date()).catch((error) => {
      console.error("[attendance-bot] initial attendance refresh failed", error);
    });

    this.maintenanceTimer = setInterval(() => {
      void dispatchDueEventReminders(new Date())
        .then((result) => {
          if (result.sent || result.failed) {
            console.log("[attendance-bot] scheduled reminder dispatch", result);
          }
        })
        .catch((error) => {
          console.error("[attendance-bot] scheduled reminder dispatch failed", error);
        });

      void refreshActiveEventAttendances(new Date()).catch((error) => {
        console.error("[attendance-bot] attendance refresh failed", error);
      });
    }, 60_000);
  }
}

const bot = new DiscordAttendanceBot();

void bot.start().catch((error) => {
  console.error("[attendance-bot] failed to start", error);
  process.exitCode = 1;
});

process.on("SIGINT", () => {
  bot.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  bot.stop();
  process.exit(0);
});
