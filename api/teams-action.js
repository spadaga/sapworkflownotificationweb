import { approveWorkflow, rejectWorkflow } from "../src/utils/workflow.js"

export default async function handler(req, res) {
  console.log("🔔 [TEAMS-ACTION] ============ TEAMS ACTION RECEIVED ============")
  console.log("⏰ [TEAMS-ACTION] Timestamp:", new Date().toISOString())
  console.log("📥 [TEAMS-ACTION] Request method:", req.method)
  console.log("📋 [TEAMS-ACTION] Request body:", JSON.stringify(req.body, null, 2))
  console.log("🌐 [TEAMS-ACTION] Request headers:", JSON.stringify(req.headers, null, 2))

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", true)
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  )

  if (req.method === "OPTIONS") {
    console.log("✅ [TEAMS-ACTION] OPTIONS request handled")
    res.status(200).end()
    return
  }

  if (req.method !== "POST") {
    console.error("❌ [TEAMS-ACTION] Invalid method:", req.method)
    return res.status(405).json({ message: "Method not allowed" })
  }

  try {
    // Parse Teams Action.Submit data
    let action, instanceId, taskTitle

    console.log("🔍 [TEAMS-ACTION] Parsing Teams Action.Submit data...")

    // Teams sends Action.Submit data in the 'value' property
    if (req.body.value) {
      action = req.body.value.action
      instanceId = req.body.value.instanceId
      taskTitle = req.body.value.taskTitle
      console.log("📋 [TEAMS-ACTION] Found Action.Submit data in 'value' property")
    }
    // Fallback: check direct properties
    else if (req.body.action && req.body.instanceId) {
      action = req.body.action
      instanceId = req.body.instanceId
      taskTitle = req.body.taskTitle
      console.log("📋 [TEAMS-ACTION] Found direct action data")
    }
    // Check for nested data structure
    else if (req.body.data) {
      action = req.body.data.action
      instanceId = req.body.data.instanceId
      taskTitle = req.body.data.taskTitle
      console.log("📋 [TEAMS-ACTION] Found nested data structure")
    }

    console.log("🎯 [TEAMS-ACTION] Extracted data:")
    console.log("📋 [TEAMS-ACTION] Action:", action)
    console.log("🆔 [TEAMS-ACTION] Instance ID:", instanceId)
    console.log("📝 [TEAMS-ACTION] Task Title:", taskTitle)

    if (!action || !instanceId) {
      console.error("❌ [TEAMS-ACTION] Missing required fields:", { action, instanceId })
      console.error("📋 [TEAMS-ACTION] Full request body:", JSON.stringify(req.body, null, 2))

      // Return an adaptive card response for Teams
      return res.status(200).json({
        type: "AdaptiveCard",
        body: [
          {
            type: "TextBlock",
            text: "❌ Error: Missing action or instanceId",
            weight: "bolder",
            color: "attention",
          },
          {
            type: "TextBlock",
            text: "Please try again or contact support.",
            size: "small",
          },
        ],
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        version: "1.3",
      })
    }

    console.log(`🎯 [TEAMS-ACTION] Processing ${action.toUpperCase()} action for instance: ${instanceId}`)

    let result
    let statusMessage = ""

    if (action === "approve") {
      console.log("✅ [TEAMS-ACTION] Starting approval process...")
      statusMessage = `✅ **LIVE APPROVAL** - Processing live SAP approval for workflow ${instanceId}`

      try {
        result = await approveWorkflow(instanceId)
        console.log(`🎉 [TEAMS-ACTION] Workflow ${instanceId} approved successfully!`)

        if (result.success && result.Status === "COMPLETED") {
          statusMessage += `\n\n✅ **Success** to approve workflow ${instanceId}. Status: ${result.Status}`
        } else {
          statusMessage += `\n\n❌ **Failed** to approve workflow ${instanceId}. Status: ${result.Status || "UNKNOWN"}`
        }
      } catch (error) {
        console.error(`❌ [TEAMS-ACTION] Approval failed:`, error.message)
        statusMessage += `\n\n❌ **Failed** to approve workflow ${instanceId}. Error: ${error.message}`
        result = { success: false, Status: "ERROR", message: error.message }
      }
    } else if (action === "reject") {
      console.log("❌ [TEAMS-ACTION] Starting rejection process...")
      statusMessage = `❌ **LIVE REJECTION** - Processing live SAP rejection for workflow ${instanceId}`

      try {
        result = await rejectWorkflow(instanceId)
        console.log(`🎉 [TEAMS-ACTION] Workflow ${instanceId} rejected successfully!`)

        if (result.success && result.Status === "COMPLETED") {
          statusMessage += `\n\n✅ **Success** to reject workflow ${instanceId}. Status: ${result.Status}`
        } else {
          statusMessage += `\n\n❌ **Failed** to reject workflow ${instanceId}. Status: ${result.Status || "UNKNOWN"}`
        }
      } catch (error) {
        console.error(`❌ [TEAMS-ACTION] Rejection failed:`, error.message)
        statusMessage += `\n\n❌ **Failed** to reject workflow ${instanceId}. Error: ${error.message}`
        result = { success: false, Status: "ERROR", message: error.message }
      }
    } else {
      console.error("❌ [TEAMS-ACTION] Invalid action specified:", action)
      return res.status(200).json({
        type: "AdaptiveCard",
        body: [
          {
            type: "TextBlock",
            text: `❌ Error: Invalid action '${action}'`,
            weight: "bolder",
            color: "attention",
          },
        ],
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
        version: "1.3",
      })
    }

    // Send success/failure response as adaptive card - stays in Teams!
    const responseCard = {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          text: statusMessage,
          wrap: true,
          size: "medium",
        },
        {
          type: "TextBlock",
          text: `**Instance ID:** ${instanceId}`,
          size: "small",
          spacing: "medium",
        },
        {
          type: "TextBlock",
          text: `**Processed at:** ${new Date().toLocaleString()}`,
          size: "small",
        },
      ],
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.3",
    }

    console.log("📤 [TEAMS-ACTION] Sending response as adaptive card")
    console.log("🎉 [TEAMS-ACTION] ============ TEAMS ACTION SUCCESS ============")

    res.status(200).json(responseCard)
  } catch (error) {
    console.error(`💥 [TEAMS-ACTION] ============ TEAMS ACTION FAILED ============`)
    console.error("⏰ [TEAMS-ACTION] Error timestamp:", new Date().toISOString())
    console.error("🔍 [TEAMS-ACTION] Error message:", error.message)
    console.error("📊 [TEAMS-ACTION] Error stack:", error.stack)

    // Send error response as adaptive card
    const errorResponse = {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          text: "❌ Error processing request",
          weight: "bolder",
          color: "attention",
        },
        {
          type: "TextBlock",
          text: error.message,
          size: "small",
          wrap: true,
        },
        {
          type: "TextBlock",
          text: `Error at: ${new Date().toLocaleString()}`,
          size: "small",
        },
      ],
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.3",
    }

    console.log("📤 [TEAMS-ACTION] Sending error response as adaptive card")
    res.status(200).json(errorResponse)
  }
}
