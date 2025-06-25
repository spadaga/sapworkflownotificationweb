// Vercel automatically loads environment variables, no need for dotenv

// Sanitize NODE_ENV to prevent issues with trailing spaces
const nodeEnv = (process.env.NODE_ENV || "production").trim()

export const isProduction = nodeEnv === "production"
export const port = process.env.PORT || 3000

// Bot Framework Configuration
export const botAppId = process.env.BOT_APP_ID
export const botAppPassword = process.env.BOT_APP_PASSWORD
export const botServiceUrl = process.env.BOT_SERVICE_URL || "https://smba.trafficmanager.net/apis/"
export const botConversationId = process.env.BOT_CONVERSATION_ID

// SAP Configuration
export const sapApiUrl = process.env.SAP_API_URL || "https://c6674ca9trial.authentication.ap21.hana.ondemand.com"
export const sapClientId = process.env.SAP_CLIENT_ID
export const sapClientSecret = process.env.SAP_CLIENT_SECRET

// Other Configuration
export const appUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.APP_URL
export const inboxUrl = process.env.INBOX_URL
