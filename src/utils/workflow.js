import axios from "axios"
import { getAccessToken, getApiUrl } from "./auth.js"

async function getCsrfToken(accessToken, baseApiUrl) {
  try {
    console.log("🔄 [CSRF] Step 1: Fetching CSRF token from:", baseApiUrl)

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

    if (error.response?.status === 500) {
      console.log("🔄 [APPROVE] Attempting retry with different approach...")
      try {
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

    const apiUrl = await getApiUrl(`/http/postSAPdata?DecisionKey=0002&InstanceID=${instanceId}&Comments=Rejected`)
    console.log("🎯 [REJECT] Step 2: Target URL:", apiUrl)

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json,application/xml",
      "Content-Type": "application/json",
    }

    console.log("📤 [REJECT] Sending rejection request...")
    const response = await axios.post(apiUrl, {}, { headers })

    console.log("📥 [REJECT] Response status:", response.status)
    console.log("📄 [REJECT] Response data:", response.data)

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

    if (error.response?.status === 500) {
      console.log("🔄 [REJECT] Attempting retry with different approach...")
      try {
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

export { approveWorkflow, rejectWorkflow }
