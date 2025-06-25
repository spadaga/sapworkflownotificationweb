import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Synchronous environment variable loading using ES6 imports
function loadEnvironmentVariablesSync() {
  if (!process.env.BOT_APP_ID) {
    try {
      const envPath = join(process.cwd(), '.env.local')
      
      if (existsSync(envPath)) {
        const envFile = readFileSync(envPath, 'utf8')
        const envVars = envFile.split('\n').filter(line => line.includes('=') && !line.startsWith('#'))
        
        envVars.forEach(line => {
          const [key, ...valueParts] = line.split('=')
          const value = valueParts.join('=').replace(/^"|"$/g, '').trim()
          if (key && value) {
            process.env[key.trim()] = value
          }
        })
        
        console.log("✅ [ENV] Manually loaded environment variables from .env.local")
        return true
      } else {
        console.log("❌ [ENV] .env.local file not found at:", envPath)
        return false
      }
    } catch (error) {
      console.error("❌ [ENV] Failed to manually load environment:", error.message)
      return false
    }
  }
  return false
}

// Load environment variables immediately when module loads
loadEnvironmentVariablesSync()

export default async function handler(req, res) {
  console.log("🚀 [TRIGGER] ============ WORKFLOW TRIGGER STARTED ============")
  console.log("⏰ [TRIGGER] Timestamp:", new Date().toISOString())
  console.log("📥 [TRIGGER] Request method:", req.method)
  console.log("📋 [TRIGGER] Request body:", JSON.stringify(req.body, null, 2))

  // Debug environment variables
  console.log("🔍 [DEBUG] Environment check:")
  console.log("NODE_ENV:", process.env.NODE_ENV)
  console.log("All BOT vars:", Object.keys(process.env).filter(key => key.startsWith('BOT_')))
  console.log("BOT_APP_ID exists:", !!process.env.BOT_APP_ID)
  console.log("BOT_APP_PASSWORD exists:", !!process.env.BOT_APP_PASSWORD)
  console.log("BOT_CONVERSATION_ID exists:", !!process.env.BOT_CONVERSATION_ID)

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", true)
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  )

  if (req.method === "OPTIONS") {
    console.log("✅ [TRIGGER] OPTIONS request handled")
    res.status(200).end()
    return
  }

  if (req.method !== "POST") {
    console.error("❌ [TRIGGER] Invalid method:", req.method)
    return res.status(405).json({ 
      message: `Method ${req.method} not allowed. This endpoint only accepts POST requests.`,
      allowedMethods: ["POST"],
      example: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { instanceId: "000000063553" }
      }
    })
  }

  try {
    // Bot configuration
    const botAppId = process.env.BOT_APP_ID
    const botAppPassword = process.env.BOT_APP_PASSWORD
    const botServiceUrl = process.env.BOT_SERVICE_URL || "https://smba.trafficmanager.net/apis/"
    const conversationId = process.env.BOT_CONVERSATION_ID
    const inboxUrl = process.env.INBOX_URL

    console.log("🔧 [TRIGGER] Bot configuration:")
    console.log("🤖 [TRIGGER] Bot App ID:", botAppId ? "SET" : "NOT SET")
    console.log("🔑 [TRIGGER] Bot Password:", botAppPassword ? "SET" : "NOT SET")
    console.log("🌐 [TRIGGER] Service URL:", botServiceUrl)
    console.log("💬 [TRIGGER] Conversation ID:", conversationId ? "SET" : "NOT SET")
    console.log("📥 [TRIGGER] Inbox URL:", inboxUrl ? "SET" : "NOT SET")

    if (!botAppId || !botAppPassword || !conversationId) {
      console.error("❌ [TRIGGER] Bot configuration is incomplete")
      return res.status(500).json({
        message: "Bot configuration is incomplete. Please set BOT_APP_ID, BOT_APP_PASSWORD, and BOT_CONVERSATION_ID.",
      })
    }

    // Get instance ID from request body
    const instanceId = req.body?.instanceId || "000000063553"
    console.log("🎯 [TRIGGER] Using instance ID:", instanceId)

    // Use request body data or fallback to defaults
    const workflowData = {
      TASK_TITLE: req.body?.taskTitle || "Verify General Journal Entry 100000155 GMM1 2025",
      Status: req.body?.status || "READY",
      INST_ID: instanceId,
      TASKDETAILS: req.body?.taskDetails || " #$# Document Type : G/L Account Document #$# Company Code : GM Manufacturing #$# Amount : 1.700,00 USD",
      CREATED_BY_NAME: req.body?.createdByName || "SAP System",
      CREATED_ON: req.body?.createdOn || new Date().toISOString(),
      INBOXURL: inboxUrl || "https://yawss4hsbx.sapyash.com:44301/sap/bc/ui2/flp?sap-client=100&sap-language=EN#WorkflowTask-displayInbox",
    }

    console.log("📋 [TRIGGER] Workflow data prepared:", JSON.stringify(workflowData, null, 2))

    // Get bot access token
    const accessToken = await getBotAccessToken(botAppId, botAppPassword)

    // Create the adaptive card with Action.Submit (no browser opening)
    const adaptiveCardJson = createTeamsInlineCard(workflowData, true)

    console.log("📤 [TRIGGER] Sending notification to bot chat...")
    console.log("🎨 [TRIGGER] Adaptive card actions:", adaptiveCardJson.attachments?.[0]?.content?.actions?.length || 0)

    // Import axios dynamically
    const axios = (await import("axios")).default

    // Send message to bot conversation
    const botResponse = await axios.post(
      `${botServiceUrl}v3/conversations/${conversationId}/activities`,
      adaptiveCardJson,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    )

    console.log("✅ [TRIGGER] Bot response status:", botResponse.status)
    console.log("📄 [TRIGGER] Bot response data:", JSON.stringify(botResponse.data, null, 2))
    console.log("🎉 [TRIGGER] ============ WORKFLOW TRIGGER SUCCESS ============")

    res.status(200).json({
      message: `Success! Workflow notification sent to bot chat with ${
        adaptiveCardJson.attachments?.[0]?.content?.actions?.length || 0
      } actions.`,
      instanceId: instanceId,
      actionsCount: adaptiveCardJson.attachments?.[0]?.content?.actions?.length || 0,
    })
  } catch (error) {
    console.error("💥 [TRIGGER] ============ WORKFLOW TRIGGER FAILED ============")
    console.error("❌ [TRIGGER] Error message:", error.message)
    console.error("📊 [TRIGGER] Error response status:", error.response?.status)
    console.error("📄 [TRIGGER] Error response data:", JSON.stringify(error.response?.data, null, 2))
    console.error("🔍 [TRIGGER] Full error:", error)

    const errorMessage = error.response
      ? `Status ${error.response.status}: ${JSON.stringify(error.response.data, null, 2)}`
      : error.message

    res.status(500).json({
      message: "An internal server error occurred while sending the notification to bot chat.",
      error: errorMessage,
    })
  }
}

// Get Bot Framework access token
async function getBotAccessToken(appId, appPassword) {
  console.log("🔐 [BOT-AUTH] Getting bot access token...")
  try {
    const axios = (await import("axios")).default

    const tokenResponse = await axios.post(
      "https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: appId,
        client_secret: appPassword,
        scope: "https://api.botframework.com/.default",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    )

    console.log("✅ [BOT-AUTH] Bot access token retrieved successfully")
    return tokenResponse.data.access_token
  } catch (error) {
    console.error("❌ [BOT-AUTH] Failed to get bot access token:", error.response?.data)
    throw new Error("Failed to authenticate with Bot Framework")
  }
}

// Create adaptive card for Teams with Action.Submit (no browser opening)
function createTeamsInlineCard(workflow, isLiveData = true) {
  console.log("🎨 [CARD] ============ CREATING TEAMS INLINE CARD ============")
  console.log("📋 [CARD] Workflow data:", JSON.stringify(workflow, null, 2))

  try {
    if (!workflow || typeof workflow !== "object") {
      throw new Error("Invalid workflow object provided")
    }

    // Map fields based on data type
    let safeWorkflow
    if (isLiveData) {
      safeWorkflow = {
        TaskTitle: workflow.TASK_TITLE || "Untitled Task",
        Status: workflow.Status || "READY",
        InstanceID: workflow.INST_ID || "N/A",
        TaskDetails: workflow.TASKDETAILS || "",
        CreatedByName: workflow.CREATED_BY_NAME || "Unknown",
        CreatedOn: workflow.CREATED_ON || new Date().toISOString(),
        InboxURL: workflow.INBOXURL || "#",
      }
    } else {
      safeWorkflow = {
        TaskTitle: workflow.TaskTitle || "Untitled Task",
        Status: workflow.Status || "READY",
        InstanceID: workflow.InstanceID || "N/A",
        TaskDetails: workflow.TaskDetails || "",
        CreatedByName: workflow.CreatedByName || "Unknown",
        CreatedOn: workflow.CreatedOn || new Date().toISOString(),
        InboxURL: workflow.InboxURL || "#",
      }
    }

    console.log("✅ [CARD] Mapped workflow data:", JSON.stringify(safeWorkflow, null, 2))

    let companyCode = "N/A",
      amount = "N/A",
      documentType = "N/A"

    if (safeWorkflow.TaskDetails) {
      const companyCodeMatch = safeWorkflow.TaskDetails.match(/Company Code\s*:\s*([^#$]+)/)
      if (companyCodeMatch) companyCode = companyCodeMatch[1].trim()

      const amountMatch = safeWorkflow.TaskDetails.match(/Amount\s*:\s*([^#$]+)/)
      if (amountMatch) amount = amountMatch[1].trim()

      const docTypeMatch = safeWorkflow.TaskDetails.match(/Document Type\s*:\s*([^#$]+)/)
      if (docTypeMatch) documentType = docTypeMatch[1].trim()
    }

    let formattedDate = "N/A"
    try {
      const createdDate = new Date(safeWorkflow.CreatedOn)
      if (!isNaN(createdDate.getTime())) {
        formattedDate = createdDate.toLocaleString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      }
    } catch (dateError) {
      console.warn("🗓️ [CARD] Date formatting error:", dateError.message)
    }

    // Create adaptive card content with Action.Submit (stays in Teams)
    const cardContent = {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          text: "🔔 **New Workflow Notification**",
          weight: "bolder",
          size: "large",
          color: "accent",
        },
        {
          type: "TextBlock",
          text: safeWorkflow.TaskTitle,
          weight: "bolder",
          size: "medium",
          wrap: true,
          spacing: "medium",
        },
        {
          type: "Container",
          items: [
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  items: [{ type: "TextBlock", text: "**Status:**", size: "small" }],
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [{ type: "TextBlock", text: safeWorkflow.Status, size: "small", color: "good" }],
                },
              ],
            },
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  items: [{ type: "TextBlock", text: "**Instance ID:**", size: "small" }],
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [{ type: "TextBlock", text: safeWorkflow.InstanceID, size: "small" }],
                },
              ],
            },
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  items: [{ type: "TextBlock", text: "**Created By:**", size: "small" }],
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [{ type: "TextBlock", text: safeWorkflow.CreatedByName, size: "small" }],
                },
              ],
            },
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  items: [{ type: "TextBlock", text: "**Created On:**", size: "small" }],
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [{ type: "TextBlock", text: formattedDate, size: "small" }],
                },
              ],
            },
          ],
          style: "emphasis",
          spacing: "medium",
        },
        {
          type: "Container",
          items: [
            {
              type: "TextBlock",
              text: "**Task Details:**",
              weight: "bolder",
              size: "small",
              spacing: "medium",
            },
            {
              type: "TextBlock",
              text: `📄 **Document Type:** ${documentType}`,
              size: "small",
              spacing: "small",
              wrap: true,
            },
            {
              type: "TextBlock",
              text: `🏢 **Company Code:** ${companyCode}`,
              size: "small",
              spacing: "small",
              wrap: true,
            },
            {
              type: "TextBlock",
              text: `💰 **Amount:** ${amount}`,
              size: "small",
              spacing: "small",
              wrap: true,
            },
          ],
          spacing: "medium",
        },
      ],
      actions: [
        {
          type: "Action.Submit",
          title: "✅ Approve",
          data: {
            action: "approve",
            instanceId: safeWorkflow.InstanceID,
            taskTitle: safeWorkflow.TaskTitle,
            timestamp: new Date().toISOString(),
          },
          style: "positive",
        },
        {
          type: "Action.Submit",
          title: "❌ Reject",
          data: {
            action: "reject",
            instanceId: safeWorkflow.InstanceID,
            taskTitle: safeWorkflow.TaskTitle,
            timestamp: new Date().toISOString(),
          },
          style: "destructive",
        },
        {
          type: "Action.OpenUrl",
          title: "👁 View in SAP Inbox",
          url: safeWorkflow.InboxURL,
        },
      ],
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.3",
    }

    // Bot Framework message format
    const botMessage = {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: cardContent,
        },
      ],
    }

    console.log("🎉 [CARD] ============ TEAMS INLINE CARD CREATED SUCCESSFULLY ============")
    console.log("🔘 [CARD] Actions included:", cardContent.actions.length)
    console.log("📋 [CARD] Action types:", cardContent.actions.map((a) => a.type))

    return botMessage
  } catch (error) {
    console.error("💥 [CARD] Error creating Teams inline card:", error.message, error.stack)
    return {
      type: "message",
      text: `❌ Error creating workflow notification: ${error.message}`,
    }
  }
}
