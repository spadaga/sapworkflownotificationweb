export default async function handler(req, res) {
  console.log("🚀 [TRIGGER] Raw request received at", new Date().toISOString());
  console.log("📥 [TRIGGER] Method:", req.method);
  console.log("📥 [TRIGGER] URL:", req.url);
  console.log("📥 [TRIGGER] Headers:", JSON.stringify(req.headers, null, 2));
  console.log("📋 [TRIGGER] Body:", JSON.stringify(req.body, null, 2));
  console.log("📥 [TRIGGER] Raw Headers:", Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join("\n"));

  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Origin");

  if (req.method === "OPTIONS") {
    console.log("✅ [TRIGGER] OPTIONS request handled");
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    console.error("❌ [TRIGGER] Method not allowed:", req.method);
    return res.status(405).json({ error: "Method not allowed, use POST" });
  }

  try {
    const botAppId = process.env.BOT_APP_ID;
    const botAppPassword = process.env.BOT_APP_PASSWORD;
    const botServiceUrl = process.env.BOT_SERVICE_URL || "https://smba.trafficmanager.net/apis/";
    const conversationId = process.env.BOT_CONVERSATION_ID;
    const inboxUrl = process.env.INBOX_URL;

    if (!botAppId || !botAppPassword || !conversationId) {
      console.error("❌ [TRIGGER] Missing required env vars");
      return res.status(500).json({ error: "Missing bot configuration" });
    }

    const instanceId = req.body?.instanceId || "000000063553";
    console.log("🎯 [TRIGGER] Using instanceId:", instanceId);

    const workflowData = {
      TASK_TITLE: req.body?.taskTitle || "Verify General Journal Entry 100000155 GMM1 2025",
      Status: req.body?.status || "READY",
      INST_ID: instanceId,
      TASKDETAILS: req.body?.taskDetails || " #$# Document Type : G/L Account Document #$# Company Code : GM Manufacturing #$# Amount : 1.700,00 USD",
      CREATED_BY_NAME: req.body?.createdByName || "Ayush Agrawal",
      CREATED_ON: req.body?.createdOn || new Date().toISOString(),
      INBOXURL: inboxUrl || "https://yawss4hsbx.sapyash.com:44301/sap/bc/ui2/flp?sap-client=100&sap-language=EN#WorkflowTask-displayInbox",
    };

    console.log("📋 [TRIGGER] Workflow data:", JSON.stringify(workflowData, null, 2));

    const accessToken = await getBotAccessToken(botAppId, botAppPassword);
    const adaptiveCardJson = createTeamsInlineCard(workflowData, true);

    console.log("📤 [TRIGGER] Sending to bot...");
    const axios = (await import("axios")).default;
    const botResponse = await axios.post(
      `${botServiceUrl}v3/conversations/${conversationId}/activities`,
      adaptiveCardJson,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ [TRIGGER] Bot response:", botResponse.status, botResponse.data);
    res.status(200).json({
      message: `Success! Workflow notification sent with ${adaptiveCardJson.attachments?.[0]?.content?.actions?.length || 0} actions`,
      instanceId,
      actionsCount: adaptiveCardJson.attachments?.[0]?.content?.actions?.length || 0,
    });
  } catch (error) {
    console.error("💥 [TRIGGER] Error:", error.message, error.response?.data);
    res.status(500).json({ error: "Failed to send workflow notification", details: error.message });
  }
}

async function getBotAccessToken(appId, appPassword) {
  console.log("🔐 [AUTH] Fetching token...");
  try {
    const axios = (await import("axios")).default;
    const response = await axios.post(
      "https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: appId,
        client_secret: appPassword,
        scope: "https://api.botframework.com/.default",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    console.log("✅ [AUTH] Token fetched");
    return response.data.access_token;
  } catch (error) {
    console.error("❌ [AUTH] Token fetch failed:", error.response?.data);
    throw error;
  }
}

function createTeamsInlineCard(workflow, isLiveData = true) {
  console.log("🎨 [CARD] Creating card...");
  try {
    const safeWorkflow = isLiveData
      ? {
          TaskTitle: workflow.TASK_TITLE || "Untitled Task",
          Status: workflow.Status || "READY",
          InstanceID: workflow.INST_ID || "N/A",
          TaskDetails: workflow.TASKDETAILS || "",
          CreatedByName: workflow.CREATED_BY_NAME || "Unknown",
          CreatedOn: workflow.CREATED_ON || new Date().toISOString(),
          InboxURL: workflow.INBOXURL || "#",
        }
      : {
          TaskTitle: workflow.TaskTitle || "Untitled Task",
          Status: workflow.Status || "READY",
          InstanceID: workflow.InstanceID || "N/A",
          TaskDetails: workflow.TaskDetails || "",
          CreatedByName: workflow.CreatedByName || "Unknown",
          CreatedOn: workflow.CreatedOn || new Date().toISOString(),
          InboxURL: workflow.InboxURL || "#",
        };

    const [documentType, companyCode, amount] = safeWorkflow.TaskDetails
      ? safeWorkflow.TaskDetails.match(/Document Type\s*:\s*([^#$]+)|Company Code\s*:\s*([^#$]+)|Amount\s*:\s*([^#$]+)/)?.slice(1).map(m => m?.trim() || "N/A")
      : ["N/A", "N/A", "N/A"];

    const formattedDate = new Date(safeWorkflow.CreatedOn).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) || "N/A";

    const cardContent = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.3",
      body: [
        { type: "TextBlock", text: "🔔 **New Workflow Notification**", weight: "bolder", size: "large", color: "accent" },
        { type: "TextBlock", text: safeWorkflow.TaskTitle, weight: "bolder", size: "medium", wrap: true, spacing: "medium" },
        {
          type: "Container",
          items: [
            { type: "ColumnSet", columns: [{ type: "Column", width: "auto", items: [{ type: "TextBlock", text: "**Status:**", size: "small" }] }, { type: "Column", width: "stretch", items: [{ type: "TextBlock", text: safeWorkflow.Status, size: "small", color: "good" }] }] },
            { type: "ColumnSet", columns: [{ type: "Column", width: "auto", items: [{ type: "TextBlock", text: "**Instance ID:**", size: "small" }] }, { type: "Column", width: "stretch", items: [{ type: "TextBlock", text: safeWorkflow.InstanceID, size: "small" }] }] },
            { type: "ColumnSet", columns: [{ type: "Column", width: "auto", items: [{ type: "TextBlock", text: "**Created By:**", size: "small" }] }, { type: "Column", width: "stretch", items: [{ type: "TextBlock", text: safeWorkflow.CreatedByName, size: "small" }] }] },
            { type: "ColumnSet", columns: [{ type: "Column", width: "auto", items: [{ type: "TextBlock", text: "**Created On:**", size: "small" }] }, { type: "Column", width: "stretch", items: [{ type: "TextBlock", text: formattedDate, size: "small" }] }] },
          ],
          style: "emphasis",
          spacing: "medium",
        },
        {
          type: "Container",
          items: [
            { type: "TextBlock", text: "**Task Details:**", weight: "bolder", size: "small", spacing: "medium" },
            { type: "TextBlock", text: `📄 **Document Type:** ${documentType}`, size: "small", spacing: "small", wrap: true },
            { type: "TextBlock", text: `🏢 **Company Code:** ${companyCode}`, size: "small", spacing: "small", wrap: true },
            { type: "TextBlock", text: `💰 **Amount:** ${amount}`, size: "small", spacing: "small", wrap: true },
          ],
          spacing: "medium",
        },
      ],
      actions: [
        { type: "Action.Submit", title: "✅ Approve", data: { action: "approve", instanceId: safeWorkflow.InstanceID }, style: "positive" },
        { type: "Action.Submit", title: "❌ Reject", data: { action: "reject", instanceId: safeWorkflow.InstanceID }, style: "destructive" },
        { type: "Action.OpenUrl", title: "👁 View in SAP Inbox", url: safeWorkflow.InboxURL },
      ],
    };

    return { type: "message", attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content: cardContent }] };
  } catch (error) {
    console.error("💥 [CARD] Error:", error.message);
    return { type: "message", text: `Error: ${error.message}` };
  }
}