# RF Guild CRM

Standalone RF Online guild dashboard inspired by the clean RF Default control-panel visual language.

## Included

- Next.js App Router + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Docker Compose for local PostgreSQL
- Registration with admin approval
- Optional Discord approval notifications and actions
- Optional Discord OAuth registration and sign-in
- Demo login/session cookie
- Dashboard
- Members
- Online members
- Guild management
- Settings
- Seed data
- Graceful mock fallback if PostgreSQL is not running

## Run locally

```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

Open http://localhost:3000

Demo login:

- Email: `admin@guild.local`
- Password: `admin123`

Pending applicant demo:

- Email: `applicant@guild.local`
- Password: `pending123`

## Important

The current authentication is intentionally lightweight. Approval workflow and password hashing are included, but before public deployment you should still replace cookie-only sessions with a production-grade authentication system.

The app does **not** call the official RF Default API. `isOnline` is stored in the standalone PostgreSQL database and can later be updated by whatever source you choose.

## Discord approval flow

If you set Discord settings, each new registration can post into a Discord review channel and mention admins.

- `DISCORD_SERVER_NAME`: optional default server name shown on registration
- `DISCORD_INVITE_URL`: optional default invite URL shown on registration
- `DISCORD_REGISTRATION_LABEL`: optional default channel label used in the Discord message text
- `DISCORD_REGISTRATION_CHANNEL_ID`: channel ID where the bot should post approval requests
- `DISCORD_BOT_TOKEN`: bot token for your Discord app, required for clickable Discord approval buttons
- `DISCORD_APPROVAL_WEBHOOK_URL`: incoming webhook URL for the review channel
- `DISCORD_INTERACTIONS_PUBLIC_KEY`: public key from your Discord application
- `DISCORD_ADMIN_ROLE_ID`: optional role ID allowed to click approve/reject
- `DISCORD_ADMIN_USER_IDS`: optional comma-separated fallback list of Discord user IDs allowed to review
- `DISCORD_OAUTH_CLIENT_ID`: OAuth client ID from your Discord application
- `DISCORD_OAUTH_CLIENT_SECRET`: OAuth client secret from your Discord application
- `DISCORD_GUILD_ID`: Discord server ID used to verify the applicant already joined your guild

Admins can also manage these values inside the app on the Settings page.

If Discord OAuth is configured, the login and registration screens will show Discord buttons. Registration is Discord-only, and the app will use the real Discord identity instead of relying on a typed handle.

For clickable `Approve` and `Reject` buttons inside Discord, configure a bot token and registration channel ID. The app will then post the approval message through the Discord bot API instead of a plain incoming webhook.

In the Discord Developer Portal, add this redirect URI to your OAuth2 settings:

`https://your-domain.com/api/auth/discord/callback`

Your Discord app also needs:

- the bot added to your server
- permission to send messages in the registration channel
- your Interactions Endpoint URL configured to:

`https://your-domain.com/api/discord/interactions`

After you deploy the app publicly, set your Discord application's Interactions Endpoint URL to:

`https://your-domain.com/api/discord/interactions`

Important: a standard Discord channel webhook can post registration alerts, but Discord may reject interactive buttons on that webhook type. In that case this app falls back to a normal message notification instead of failing.

This project does **not** automatically verify guild membership from Discord. An admin still needs to confirm that during the Discord call or chat before approving.

Applicants only need to provide their Discord handle during registration.
