import axios from "axios"

let cachedToken = null
let tokenExpiry = null

async function getApiUrl(endpoint) {
  // Use the correct SAP API URL structure
  const { sapApiUrl } = await import("../config.js")

  // The SAP API URL should point to the integration runtime, not the authentication server
  const integrationApiUrl = "https://c6674ca9trial.it-cpitrial03-rt.cfapps.ap21.hana.ondemand.com"

  return `${integrationApiUrl}${endpoint}`
}

async function getAccessToken() {
  if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
    console.log("Using cached token...")
    return cachedToken
  }

  try {
    console.log("Fetching new access token...")
    const { sapApiUrl } = await import("../config.js")
    const clientId = process.env.SAP_CLIENT_ID
    const clientSecret = process.env.SAP_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error("Client ID or Client Secret is missing in environment variables.")
    }

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

    const tokenResponse = await axios.post(
      `${sapApiUrl}/oauth/token`,
      new URLSearchParams({ grant_type: "client_credentials" }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basicAuth}` } },
    )

    cachedToken = tokenResponse.data.access_token
    const expiresIn = tokenResponse.data.expires_in || 3600
    tokenExpiry = new Date(Date.now() + (expiresIn - 300) * 1000)

    return cachedToken
  } catch (error) {
    console.error("Token fetch error:", error.response?.data)
    throw error
  }
}

export { getAccessToken, getApiUrl }
