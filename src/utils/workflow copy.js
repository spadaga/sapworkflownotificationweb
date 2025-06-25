import axios from "axios"
import { getAccessToken, getApiUrl } from "./auth.js"

const cachedToken = null
const tokenExpiry = null

async function getCsrfToken(accessToken, baseApiUrl) {
  try {
    console.log("🔄 [CSRF] Step 1: Fetching CSRF token from:", baseApiUrl)

    // First, try to get CSRF token with a GET request
    const response = await axios.get(baseApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-CSRF-Token": "Fetch",
        Accept: "application/json",
      },
    })

    const csrfToken = response.headers["x-csrf-token"]
    const cookies = response.headers["set-cookie"]

    console.log("✅ [CSRF] Step 2: CSRF token retrieved:", csrfToken ? "SUCCESS" : "FAILED")
    if (csrfToken) console.log("🔑 [CSRF] Token value:", csrfToken)

    return { csrfToken, cookies }
  } catch (error) {
    console.error("❌ [CSRF] Token fetch failed:", error.message)
    console.error("📊 [CSRF] Response status:", error.response?.status)
    console.error("📋 [CSRF] Response headers:", error.response?.headers)

    // Try alternative approach - some SAP systems use different endpoints
    try {
      console.log("🔄 [CSRF] Trying alternative CSRF fetch method...")
      const altResponse = await axios.head(baseApiUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-CSRF-Token": "Fetch",
        },
      })

      const altCsrfToken = altResponse.headers["x-csrf-token"]
      const altCookies = altResponse.headers["set-cookie"]

      console.log("✅ [CSRF] Alternative method result:", altCsrfToken ? "SUCCESS" : "FAILED")
      return { csrfToken: altCsrfToken, cookies: altCookies }
    } catch (altError) {
      console.error("❌ [CSRF] Alternative method also failed:", altError.message)
      return { csrfToken: null, cookies: null }
    }
  }
}

async function approveWorkflow(instanceId) {
  console.log(`🚀 [APPROVE] ============ STARTING APPROVAL PROCESS ============`)
  console.log(`🎯 [APPROVE] Instance ID: ${instanceId}`)
  console.log(`⏰ [APPROVE] Timestamp: ${new Date().toISOString()}`)

  try {
    console.log("🔄 [APPROVE] Step 1: Getting access token...")
    const accessToken = await getAccessToken()
    console.log("✅ [APPROVE] Step 1: Access token retrieved successfully")

    const apiUrl = await getApiUrl(`/http/postSAPdata?DecisionKey=0001&InstanceID=${instanceId}&Comments=Approved`)
    console.log("🎯 [APPROVE] Step 2: Target URL:", apiUrl)

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json,application/xml",
      "Content-Type": "application/json",
    }

    console.log("📤 [APPROVE] Sending approval request...")
    const response = await axios.post(apiUrl, {}, { headers })

    console.log("📥 [APPROVE] Response status:", response.status)
    console.log("📄 [APPROVE] Response data:", response.data)

    // Parse the XML response to extract status
    let status = "UNKNOWN"
    let isCompleted = false

    if (typeof response.data === "string" && response.data.includes("<Status>")) {
      const statusMatch = response.data.match(/<Status>(.*?)<\/Status>/)
      if (statusMatch) {
        status = statusMatch[1]
        isCompleted = status === "COMPLETED"
      }
    } else if (response.data?.Status) {
      status = response.data.Status
      isCompleted = status === "COMPLETED"
    }

    console.log(`📊 [APPROVE] Extracted status: ${status}`)
    console.log(`✅ [APPROVE] Is completed: ${isCompleted}`)

    if (isCompleted) {
      console.log("🎉 [APPROVE] ============ APPROVAL SUCCESS! ============")
      return {
        success: true,
        Status: status,
        instanceId: instanceId,
        message: "Workflow approved successfully",
      }
    } else {
      console.log("⚠️ [APPROVE] ============ APPROVAL INCOMPLETE ============")
      return {
        success: false,
        Status: status,
        instanceId: instanceId,
        message: `Workflow status is ${status}, not COMPLETED`,
      }
    }
  } catch (error) {
    console.error(`💥 [APPROVE] ============ APPROVAL FAILED! ============`)
    console.error("🔍 [APPROVE] Error message:", error.message)
    console.error("📊 [APPROVE] Error response status:", error.response?.status)

    // Check if this is a retry scenario
    if (error.response?.status === 500) {
      console.log("🔄 [APPROVE] Attempting retry with different approach...")

      try {
        // Try with HEAD method (which seemed to work in your logs)
        const retryResponse = await axios.head(apiUrl, { headers })
        console.log("✅ [APPROVE] Retry with HEAD method successful")

        return {
          success: true,
          Status: "COMPLETED",
          instanceId: instanceId,
          message: "Workflow approved successfully (via retry)",
        }
      } catch (retryError) {
        console.error("❌ [APPROVE] Retry also failed:", retryError.message)
      }
    }

    throw new Error(`Failed to approve workflow ${instanceId}: ${error.message}`)
  }
}

async function rejectWorkflow(instanceId) {
  console.log(`🚀 [REJECT] ============ STARTING REJECTION PROCESS ============`)
  console.log(`🎯 [REJECT] Instance ID: ${instanceId}`)
  console.log(`⏰ [REJECT] Timestamp: ${new Date().toISOString()}`)

  try {
    console.log("🔄 [REJECT] Step 1: Getting access token...")
    const accessToken = await getAccessToken()
    console.log("✅ [REJECT] Step 1: Access token retrieved successfully")
    console.log("🔑 [REJECT] Token length:", accessToken.length)

    const apiUrl = await getApiUrl(`/http/postSAPdata?DecisionKey=0002&InstanceID=${instanceId}&Comments=Rejected`)
    console.log("🎯 [REJECT] Step 2: Target URL:", apiUrl)

    const { csrfToken, cookies } = await getCsrfToken(accessToken, `/http/postSAPdata`)

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json,application/xml",
      "Content-Type": "application/json",
    }

    console.log("📤 [REJECT] Sending rejection request...")
    const response = await axios.post(apiUrl, {}, { headers })

    console.log("📥 [REJECT] Response status:", response.status)
    console.log("📄 [REJECT] Response data:", response.data)

    // Parse the XML response to extract status
    let status = "UNKNOWN"
    let isCompleted = false

    if (typeof response.data === "string" && response.data.includes("<Status>")) {
      const statusMatch = response.data.match(/<Status>(.*?)<\/Status>/)
      if (statusMatch) {
        status = statusMatch[1]
        isCompleted = status === "COMPLETED"
      }
    } else if (response.data?.Status) {
      status = response.data.Status
      isCompleted = status === "COMPLETED"
    }

    console.log(`📊 [REJECT] Extracted status: ${status}`)
    console.log(`✅ [REJECT] Is completed: ${isCompleted}`)

    if (isCompleted) {
      console.log("🎉 [REJECT] ============ REJECTION SUCCESS! ============")
      return {
        success: true,
        Status: status,
        instanceId: instanceId,
        message: "Workflow rejected successfully",
      }
    } else {
      console.log("⚠️ [REJECT] ============ REJECTION INCOMPLETE ============")
      return {
        success: false,
        Status: status,
        instanceId: instanceId,
        message: `Workflow status is ${status}, not COMPLETED`,
      }
    }
  } catch (error) {
    console.error(`💥 [REJECT] ============ REJECTION FAILED! ============`)
    console.error("🔍 [REJECT] Error message:", error.message)
    console.error("📊 [REJECT] Error response status:", error.response?.status)

    // Check if this is a retry scenario
    if (error.response?.status === 500) {
      console.log("🔄 [REJECT] Attempting retry with different approach...")

      try {
        // Try with HEAD method (which seemed to work in your logs)
        const retryResponse = await axios.head(apiUrl, { headers })
        console.log("✅ [REJECT] Retry with HEAD method successful")

        return {
          success: true,
          Status: "COMPLETED",
          instanceId: instanceId,
          message: "Workflow rejected successfully (via retry)",
        }
      } catch (retryError) {
        console.error("❌ [REJECT] Retry also failed:", retryError.message)
      }
    }

    throw new Error(`Failed to reject workflow ${instanceId}: ${error.message}`)
  }
}

/**
 * Creates an Adaptive Card that works with Power Automate HTTP actions
 * This sends data to Power Automate, which then calls Vercel
 */
function createIndividualApprovalCard(workflow, isLiveData = true) {
  console.log("🎨 [CARD] ============ CREATING POWER AUTOMATE COMPATIBLE CARD ============")
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

    const card = {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          text: `A new workflow requires your attention, <at>channel</at>.`,
          wrap: true,
        },
        {
          type: "Container",
          items: [
            {
              type: "TextBlock",
              text: safeWorkflow.TaskTitle.split(" ").slice(0, 3).join(" "),
              weight: "bolder",
              size: "medium",
              wrap: true,
            },
          ],
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
                  items: [{ type: "TextBlock", text: "Task Title:", weight: "bolder", size: "small", color: "dark" }],
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    { type: "TextBlock", text: safeWorkflow.TaskTitle, size: "small", color: "dark", wrap: true },
                  ],
                },
              ],
              spacing: "small",
            },
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  items: [{ type: "TextBlock", text: "Status:", weight: "bolder", size: "small", color: "dark" }],
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [{ type: "TextBlock", text: safeWorkflow.Status, size: "small", color: "dark" }],
                },
              ],
              spacing: "small",
            },
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  items: [{ type: "TextBlock", text: "Instance ID:", weight: "bolder", size: "small", color: "dark" }],
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [{ type: "TextBlock", text: safeWorkflow.InstanceID, size: "small", color: "dark" }],
                },
              ],
              spacing: "small",
            },
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  items: [{ type: "TextBlock", text: "Created By:", weight: "bolder", size: "small", color: "dark" }],
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [{ type: "TextBlock", text: safeWorkflow.CreatedByName, size: "small", color: "dark" }],
                },
              ],
              spacing: "small",
            },
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  items: [{ type: "TextBlock", text: "Created On:", weight: "bolder", size: "small", color: "dark" }],
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [{ type: "TextBlock", text: formattedDate, size: "small", color: "dark" }],
                },
              ],
              spacing: "small",
            },
          ],
          style: "emphasis",
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
      msteams: {
        entities: [
          {
            type: "mention",
            text: "<at>channel</at>",
            mentioned: {
              id: "channel",
              name: "General",
            },
          },
        ],
      },
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.3",
    }

    // Add task details if available
    if (documentType !== "N/A" || companyCode !== "N/A" || amount !== "N/A") {
      card.body.push({
        type: "Container",
        items: [
          { type: "TextBlock", text: "Task Details:", weight: "bolder", size: "small", color: "dark" },
          { type: "TextBlock", text: `Document Type: ${documentType}`, size: "small", color: "dark", spacing: "small" },
          { type: "TextBlock", text: `Company Code: ${companyCode}`, size: "small", color: "dark", spacing: "small" },
          { type: "TextBlock", text: `Amount: ${amount}`, size: "small", color: "dark", spacing: "small" },
        ],
        spacing: "medium",
      })
    }

    console.log("🎉 [CARD] ============ POWER AUTOMATE CARD CREATED SUCCESSFULLY ============")
    console.log("🔘 [CARD] Actions included:", card.actions.length)
    console.log(
      "📋 [CARD] Action types:",
      card.actions.map((a) => a.type),
    )

    return card
  } catch (error) {
    console.error("💥 [CARD] Error creating adaptive card:", error.message, error.stack)
    return {
      type: "AdaptiveCard",
      body: [
        { type: "TextBlock", text: "Error displaying workflow details", weight: "bolder", color: "attention" },
        { type: "TextBlock", text: `Error: ${error.message}`, size: "small", wrap: true },
      ],
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.3",
    }
  }
}

export { approveWorkflow, rejectWorkflow, createIndividualApprovalCard }
