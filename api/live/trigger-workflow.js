export default async function handler(req, res) {

  console.log("🔍 [DEBUG] Environment check:")
console.log("NODE_ENV:", process.env.NODE_ENV)
console.log("All BOT vars:", Object.keys(process.env).filter(key => key.startsWith('BOT_')))
console.log("BOT_APP_ID exists:", !!process.env.BOT_APP_ID)
console.log("BOT_APP_PASSWORD exists:", !!process.env.BOT_APP_PASSWORD)
console.log("BOT_CONVERSATION_ID exists:", !!process.env.BOT_CONVERSATION_ID)


    console.log("🚀 [SAP-TRIGGER] ============ SAP WORKFLOW TRIGGER STARTED ============")
    console.log("⏰ [SAP-TRIGGER] Timestamp:", new Date().toISOString())
    console.log("📥 [SAP-TRIGGER] Request method:", req.method)
    console.log("🔍 [SAP-TRIGGER] Request headers:", JSON.stringify(req.headers, null, 2))
    console.log("📋 [SAP-TRIGGER] Request body:", JSON.stringify(req.body, null, 2))
  
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Credentials", true)
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT")
    res.setHeader(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type, Date, X-Api-Version, Authorization, X-API-Key",
    )
  
    if (req.method === "OPTIONS") {
      console.log("✅ [SAP-TRIGGER] OPTIONS request handled")
      res.status(200).end()
      return
    }
  
    if (req.method !== "POST") {
      console.error("❌ [SAP-TRIGGER] Invalid method:", req.method)
      return res.status(405).json({ 
        error: "Method not allowed", 
        message: "Only POST requests are supported",
        timestamp: new Date().toISOString()
      })
    }
  
    try {
      // 🔐 API Authentication Check
      const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '')
      const expectedApiKey = process.env.SAP_API_KEY
  
      if (expectedApiKey && apiKey !== expectedApiKey) {
        console.error("❌ [SAP-TRIGGER] Invalid API key provided")
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid API key. Please contact the administrator.",
          timestamp: new Date().toISOString()
        })
      }
  
      // 📋 Validate incoming SAP data
      const sapWorkflowData = req.body
      console.log("🔍 [SAP-TRIGGER] Validating SAP workflow data...")
  
      const validationResult = validateSAPWorkflowData(sapWorkflowData)
      if (!validationResult.isValid) {
        console.error("❌ [SAP-TRIGGER] Invalid SAP data:", validationResult.errors)
        return res.status(400).json({
          error: "Invalid workflow data",
          message: "Required fields are missing or invalid",
          details: validationResult.errors,
          timestamp: new Date().toISOString()
        })
      }
  
      // 🔧 Bot configuration
      const botAppId = process.env.BOT_APP_ID
      const botAppPassword = process.env.BOT_APP_PASSWORD
      const botServiceUrl = process.env.BOT_SERVICE_URL || "https://smba.trafficmanager.net/apis/"
      const conversationId = process.env.BOT_CONVERSATION_ID
  
      console.log("🔧 [SAP-TRIGGER] Bot configuration:")
      console.log("🤖 [SAP-TRIGGER] Bot App ID:", botAppId ? "SET" : "NOT SET")
      console.log("🔑 [SAP-TRIGGER] Bot Password:", botAppPassword ? "SET" : "NOT SET")
      console.log("💬 [SAP-TRIGGER] Conversation ID:", conversationId ? "SET" : "NOT SET")
  
      if (!botAppId || !botAppPassword || !conversationId) {
        console.error("❌ [SAP-TRIGGER] Bot configuration is incomplete")
        return res.status(500).json({
          error: "Configuration error",
          message: "Bot configuration is incomplete. Please contact the administrator.",
          timestamp: new Date().toISOString()
        })
      }
  
      // 🎯 Process SAP workflow data
      console.log("🎯 [SAP-TRIGGER] Processing SAP workflow:", sapWorkflowData.InstanceID || sapWorkflowData.instanceId)
  
      // 🔐 Get bot access token
      const accessToken = await getBotAccessToken(botAppId, botAppPassword)
  
      // 🎨 Create adaptive card with real SAP data
      const adaptiveCardJson = createTeamsInlineCard(sapWorkflowData, false) // false = real SAP data
  
      console.log("📤 [SAP-TRIGGER] Sending notification to Teams bot chat...")
      console.log("🎨 [SAP-TRIGGER] Adaptive card actions:", adaptiveCardJson.attachments?.[0]?.content?.actions?.length || 0)
  
      // Import axios dynamically
      const axios = (await import("axios")).default
  
      // 📨 Send message to bot conversation

      console.log("📤 [BOT] Sending to:", `${botServiceUrl}v3/conversations/${conversationId}/activities`);
console.log("📤 [BOT] Payload:", JSON.stringify(adaptiveCardJson, null, 2));


      const botResponse = await axios.post(
        `${botServiceUrl}v3/conversations/${conversationId}/activities`,
        adaptiveCardJson,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      )
  
      console.log("✅ [SAP-TRIGGER] Bot response status:", botResponse.status)
      console.log("📄 [SAP-TRIGGER] Bot response data:", JSON.stringify(botResponse.data, null, 2))
  
      console.log("🎉 [SAP-TRIGGER] ============ SAP WORKFLOW TRIGGER SUCCESS ============")
  
      // 📊 Success response for SAP system
      res.status(200).json({
        success: true,
        message: "Workflow notification sent to Teams successfully",
        data: {
          instanceId: sapWorkflowData.InstanceID || sapWorkflowData.instanceId,
          taskTitle: sapWorkflowData.TaskTitle || sapWorkflowData.taskTitle,
          teamsMessageId: botResponse.data.id,
          actionsCount: adaptiveCardJson.attachments?.[0]?.content?.actions?.length || 0,
        },
        timestamp: new Date().toISOString()
      })
  
    } catch (error) {
      console.error("💥 [SAP-TRIGGER] ============ SAP WORKFLOW TRIGGER FAILED ============")
      console.error("❌ [SAP-TRIGGER] Error message:", error.message)
      console.error("📊 [SAP-TRIGGER] Error response status:", error.response?.status)
      console.error("📄 [SAP-TRIGGER] Error response data:", JSON.stringify(error.response?.data, null, 2))
      console.error("🔍 [SAP-TRIGGER] Full error:", error.stack)
  
      const errorMessage = error.response
        ? `Teams API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        : error.message
  
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to send workflow notification to Teams",
        details: errorMessage,
        timestamp: new Date().toISOString()
      })
    }
  }
  
  // 🔍 Validate SAP workflow data
  function validateSAPWorkflowData(data) {
    const errors = []
    
    // Required fields check
    const requiredFields = [
      { field: 'InstanceID', altField: 'instanceId' },
      { field: 'TaskTitle', altField: 'taskTitle' },
      { field: 'Status', altField: 'status' },
      { field: 'CreatedByName', altField: 'createdBy' }
    ]
  
    requiredFields.forEach(({ field, altField }) => {
      if (!data[field] && !data[altField]) {
        errors.push(`Missing required field: ${field} or ${altField}`)
      }
    })
  
    // Data type validation
    const instanceId = data.InstanceID || data.instanceId
    if (instanceId && typeof instanceId !== 'string') {
      errors.push('InstanceID must be a string')
    }
  
    const taskTitle = data.TaskTitle || data.taskTitle
    if (taskTitle && typeof taskTitle !== 'string') {
      errors.push('TaskTitle must be a string')
    }
  
    return {
      isValid: errors.length === 0,
      errors: errors
    }
  }
  
  // 🔐 Get Bot Framework access token
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
        },
      )
  
      console.log("✅ [BOT-AUTH] Bot access token retrieved successfully")
      return tokenResponse.data.access_token
    } catch (error) {
      console.error("❌ [BOT-AUTH] Failed to get bot access token:", error.response?.data)
      throw new Error("Failed to authenticate with Bot Framework")
    }
  }
  
  // 🎨 Create adaptive card for Teams with real SAP data
  function createTeamsInlineCard(workflow, isLiveData = false) {
    console.log("🎨 [CARD] ============ CREATING TEAMS CARD FROM SAP DATA ============")
    console.log("📋 [CARD] SAP workflow data:", JSON.stringify(workflow, null, 2))
  
    try {
      if (!workflow || typeof workflow !== "object") {
        throw new Error("Invalid workflow object provided")
      }
  
      // 🔄 Map SAP fields to standard format (support multiple SAP formats)
      const safeWorkflow = {
        TaskTitle: workflow.TaskTitle || workflow.taskTitle || workflow.TASK_TITLE || "Untitled Task",
        Status: workflow.Status || workflow.status || workflow.STATUS || "READY",
        InstanceID: workflow.InstanceID || workflow.instanceId || workflow.INST_ID || "N/A",
        TaskDetails: workflow.TaskDetails || workflow.taskDetails || workflow.TASKDETAILS || "",
        CreatedByName: workflow.CreatedByName || workflow.createdBy || workflow.CREATED_BY_NAME || "Unknown",
        CreatedOn: workflow.CreatedOn || workflow.createdOn || workflow.CREATED_ON || new Date().toISOString(),
        InboxURL: workflow.InboxURL || workflow.inboxUrl || workflow.INBOXURL || process.env.INBOX_URL || "#",
        CompanyCode: workflow.CompanyCode || workflow.companyCode || "",
        DocumentType: workflow.DocumentType || workflow.documentType || "",
        Amount: workflow.Amount || workflow.amount || "",
      }
  
      console.log("✅ [CARD] Mapped SAP workflow data:", JSON.stringify(safeWorkflow, null, 2))
  
      // 🔍 Parse task details if provided as string
      let companyCode = safeWorkflow.CompanyCode || "N/A"
      let amount = safeWorkflow.Amount || "N/A"
      let documentType = safeWorkflow.DocumentType || "N/A"
  
      if (safeWorkflow.TaskDetails && !safeWorkflow.CompanyCode) {
        const companyCodeMatch = safeWorkflow.TaskDetails.match(/Company Code\s*:\s*([^#$]+)/)
        if (companyCodeMatch) companyCode = companyCodeMatch[1].trim()
        
        const amountMatch = safeWorkflow.TaskDetails.match(/Amount\s*:\s*([^#$]+)/)
        if (amountMatch) amount = amountMatch[1].trim()
        
        const docTypeMatch = safeWorkflow.TaskDetails.match(/Document Type\s*:\s*([^#$]+)/)
        if (docTypeMatch) documentType = docTypeMatch[1].trim()
      }
  
      // 📅 Format date
      let formattedDate = "N/A"
      try {
        const createdDate = new Date(safeWorkflow.CreatedOn)
        if (!isNaN(createdDate.getTime())) {
          formattedDate = createdDate.toLocaleString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })
        }
      } catch (dateError) {
        console.warn("🗓️ [CARD] Date formatting error:", dateError.message)
      }
  
      // 🎨 Create adaptive card content
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
  
      // 🤖 Bot Framework message format
      const botMessage = {
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: cardContent,
          },
        ],
      }
  
      console.log("🎉 [CARD] ============ TEAMS CARD CREATED FROM SAP DATA ============")
      console.log("🔘 [CARD] Actions included:", cardContent.actions.length)
  
      return botMessage
    } catch (error) {
      console.error("💥 [CARD] Error creating Teams card from SAP data:", error.message, error.stack)
      return {
        type: "message",
        text: `❌ Error creating workflow notification: ${error.message}`,
      }
    }
  }
  