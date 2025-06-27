export default async function triggerHandler(req, res, data) {
  console.log("🚀 [TRIGGER] Raw request received at", new Date().toISOString());
  console.log("📥 [TRIGGER] Method:", req.method);
  console.log("📥 [TRIGGER] URL:", req.url);
  console.log("📥 [TRIGGER] Headers:", JSON.stringify(req.headers, null, 2));
  console.log("📋 [TRIGGER] Body:", JSON.stringify(data, null, 2));
  console.log("📥 [TRIGGER] Raw Headers:", Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join("\n"));

  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Origin");

  if (req.method === "OPTIONS") {
    console.log("✅ [TRIGGER] OPTIONS request handled");
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    console.error("❌ [TRIGGER] Method not allowed:", req.method);
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "Method not allowed, use POST" }));
    return;
  }

  try {
    const botAppId = process.env.BOT_APP_ID;
    const botAppPassword = process.env.BOT_APP_PASSWORD;
    const botServiceUrl = process.env.BOT_SERVICE_URL || "https://smba.trafficmanager.net/apis/";
    const conversationId = process.env.BOT_CONVERSATION_ID;
    const inboxUrl = process.env.INBOX_URL;

    if (!botAppId || !botAppPassword || !conversationId) {
      console.error("❌ [TRIGGER] Missing required env vars");
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "Missing bot configuration" }));
      return;
    }

    const instanceId = data.instanceId || "000000063553";
    console.log("🎯 [TRIGGER] Using instanceId:", instanceId);

    const workflowData = {
      TASK_TITLE: data.taskTitle || "Verify General Journal Entry 100000155 GMM1 2025",
      Status: data.status || "READY",
      INST_ID: instanceId,
      TASKDETAILS: data.taskDetails || " #$# Document Type : G/L Account Document #$# Company Code : GM Manufacturing #$# Amount : 1.700,00 USD",
      CREATED_BY_NAME: data.createdByName || "Ayush Agrawal",
      CREATED_ON: data.createdOn || new Date().toISOString(),
      INBOXURL: inboxUrl || "https://yawss4hsbx.sapyash.com:44301/sap/bc/ui2/flp?sap-client=100&sap-language=EN#WorkflowTask-displayInbox",
      APPURL: data.AppURL || "",
    };

    console.log("📋 [TRIGGER] Workflow data:", JSON.stringify(workflowData, null, 2));

    const accessToken = await getBotAccessToken(botAppId, botAppPassword);
    let adaptiveCardJson;

    if (data.NOTIFTYPE === "Alert") {
      // Alert card with same UI as workflow notification
      const alertData = {
        TaskTitle: data.TASK_TITLE || "Alert Notification",
        UID: data.UID || "Unknown User",
        TaskDetails: data.TASKDETAILS || "",
        ACTIONBUTTONS: data.ACTIONBUTTONS || "",
        InstanceID: instanceId,
        CreatedOn: new Date().toISOString(),
      };

      console.log("📋 [TRIGGER] Alert data:", JSON.stringify(alertData, null, 2)); // Debug log for alert data
      const details = alertData.TaskDetails
        ? alertData.TaskDetails.match(/[^#$]+/g)?.map(m => m.trim()) || []
        : [];
      const [actionButton] = alertData.ACTIONBUTTONS ? alertData.ACTIONBUTTONS.match(/https?:\/\/[^\s]+/) || ["#"] : ["#"];

      const formattedDate = new Date(alertData.CreatedOn).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) || "N/A";

      // Map details to icons based on label
      const detailItems = details.map(detail => {
        const [label, value] = detail.split(':').map(s => s.trim());
        if (!value) return null; // Skip if no value
        const iconMap = {
          "Current Stock": "📦",
          "Ordered Quantity": "📦",
          "Purchase Order Date": "📅",
          "Delivery Date": "📅",
          "Plant": "🏭",
          "Material": "📋",
          "Safety Stock": "📊",
          "Shortfall": "⚠️",
          "Date": "📅"
        };
        const icon = iconMap[label] || "📄"; // Default to 📄 if no specific icon
        return { type: "TextBlock", text: `${icon} **${label}:** ${value}`, size: "small", spacing: "small", wrap: true };
      }).filter(item => item !== null);

      adaptiveCardJson = {
        type: "message",
        attachments: [{
          contentType: "application/vnd.microsoft.card.adaptive",
          content: {
            type: "AdaptiveCard",
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            version: "1.3",
            body: [
              { type: "TextBlock", text: "🔔 **Alert Notification**", weight: "bolder", size: "large", color: "accent" },
              { type: "TextBlock", text: alertData.TaskTitle, weight: "bolder", size: "medium", wrap: true, spacing: "medium" },
              {
                type: "Container",
                items: [
                  { type: "ColumnSet", columns: [{ type: "Column", width: "auto", items: [{ type: "TextBlock", text: "**Instance ID:**", size: "small" }] }, { type: "Column", width: "stretch", items: [{ type: "TextBlock", text: alertData.InstanceID, size: "small" }] }] },
                  { type: "ColumnSet", columns: [{ type: "Column", width: "auto", items: [{ type: "TextBlock", text: "**Created By:**", size: "small" }] }, { type: "Column", width: "stretch", items: [{ type: "TextBlock", text: alertData.UID, size: "small" }] }] },
                  { type: "ColumnSet", columns: [{ type: "Column", width: "auto", items: [{ type: "TextBlock", text: "**Created On:**", size: "small" }] }, { type: "Column", width: "stretch", items: [{ type: "TextBlock", text: formattedDate, size: "small" }] }] },
                ],
                style: "emphasis",
                spacing: "medium",
              },
              {
                type: "Container",
                items: [
                  { type: "TextBlock", text: "**Task Details:**", weight: "bolder", size: "small", spacing: "medium" },
                  ...detailItems,
                ],
                spacing: "medium",
              },
            ],
            actions: actionButton !== "#" ? [{ type: "Action.OpenUrl", title: "👁 Open Purchase Order", url: actionButton }] : [],
          }
        }]
      };
    } else {
      // Existing card for non-Alert notifications with Approve, Reject, and dynamic URL buttons
      adaptiveCardJson = createTeamsInlineCard(workflowData, true);
    }

    console.log("📤 [TRIGGER] Sending to bot...", JSON.stringify(adaptiveCardJson, null, 2));
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
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: `Success! Workflow notification sent with ${adaptiveCardJson.attachments?.[0]?.content?.actions?.length || 0} actions`,
      instanceId,
      actionsCount: adaptiveCardJson.attachments?.[0]?.content?.actions?.length || 0,
    }));
  } catch (error) {
    console.error("💥 [TRIGGER] Error:", error.message, error.response?.data);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "Failed to send workflow notification", details: error.message }));
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
          AppURL: workflow.APPURL || "#",
        }
      : {
          TaskTitle: workflow.TaskTitle || "Untitled Task",
          Status: workflow.Status || "READY",
          InstanceID: workflow.InstanceID || "N/A",
          TaskDetails: workflow.TaskDetails || "",
          CreatedByName: workflow.CreatedByName || "Unknown",
          CreatedOn: workflow.CreatedOn || new Date().toISOString(),
          InboxURL: workflow.InboxURL || "#",
          AppURL: workflow.AppURL || "#",
        };

    const [documentType, companyCode, amount] = safeWorkflow.TaskDetails
      ? safeWorkflow.TaskDetails.match(/Document Type\s*:\s*([^#$]+)|Company Code\s*:\s*([^#$]+)|Amount\s*:\s*([^#$]+)/)?.slice(1).map(m => m?.trim()) || []
      : [];
    const detailItems = [
      documentType ? { type: "TextBlock", text: `📄 **Document Type:** ${documentType}`, size: "small", spacing: "small", wrap: true } : null,
      companyCode ? { type: "TextBlock", text: `🏢 **Company Code:** ${companyCode}`, size: "small", spacing: "small", wrap: true } : null,
      amount ? { type: "TextBlock", text: `💰 **Amount:** ${amount}`, size: "small", spacing: "small", wrap: true } : null,
    ].filter(item => item !== null);

    const formattedDate = new Date(safeWorkflow.CreatedOn).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) || "N/A";

    const cardContent = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.3",
      body: [
        { type: "TextBlock", text: "🔔 **New Workflow Notification**", weight: "bolder", size: "large", color: "accent" },
        { type: "TextBlock", text: safeWorkflow.TaskTitle, weight: "bolder", size: "medium", wrap: "true", spacing: "medium" },
        {
          type: "Container",
          items: [
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
            ...detailItems,
          ],
          spacing: "medium",
        },
      ],
      actions: [
        { type: "Action.Submit", title: "✅ Approve", data: { action: "approve", instanceId: safeWorkflow.InstanceID }, style: "positive" },
        { type: "Action.Submit", title: "❌ Reject", data: { action: "reject", instanceId: safeWorkflow.InstanceID }, style: "destructive" },
        ...(safeWorkflow.InboxURL !== "#" && safeWorkflow.AppURL !== "#" ? [
          { type: "Action.OpenUrl", title: "👁 View in SAP Inbox", url: safeWorkflow.InboxURL },
          { type: "Action.OpenUrl", title: "📲 Open App URL", url: safeWorkflow.AppURL }
        ] : safeWorkflow.InboxURL !== "#" ? [
          { type: "Action.OpenUrl", title: "👁 View in SAP Inbox", url: safeWorkflow.InboxURL }
        ] : safeWorkflow.AppURL !== "#" ? [
          { type: "Action.OpenUrl", title: "📲 Open App URL", url: safeWorkflow.AppURL }
        ] : [])
      ],
    };

    return { type: "message", attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content: cardContent }] };
  } catch (error) {
    console.error("💥 [CARD] Error:", error.message);
    return { type: "message", text: `Error: ${error.message}` };
  }
}