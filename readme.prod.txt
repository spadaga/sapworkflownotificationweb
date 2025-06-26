Your Cloud Shell session will be ephemeral so no files or system changes will persist beyond your current session.
satya [ ~ ]$ mkdir sapworkflownotificationweb
satya [ ~ ]$ cd sapworkflownotificationweb
satya [ ~/sapworkflownotificationweb ]$ git clone https://github.com/spadaga/sapworkflownotificationweb.git sapworkflownotificationweb
Cloning into 'sapworkflownotificationweb'...
remote: Enumerating objects: 50, done.
remote: Counting objects: 100% (50/50), done.
remote: Compressing objects: 100% (30/30), done.
remote: Total 50 (delta 20), reused 44 (delta 14), pack-reused 0 (from 0)
Receiving objects: 100% (50/50), 25.82 KiB | 2.35 MiB/s, done.
Resolving deltas: 100% (20/20), done.
satya [ ~/sapworkflownotificationweb ]$ cd sapworkflownotificationweb
satya [ ~/sapworkflownotificationweb/sapworkflownotificationweb ]$ az webapp deploy \
  --resource-group sapworkflownotificationweb-rg \
  --name sapworkflownotificationweb-app \
  --src-path app-deploy.zip \
  --type zip
Initiating deployment
Deploying from local path: app-deploy.zip
Either 'app-deploy.zip' is not a valid local file path or you do not have permissions to access it
satya [ ~/sapworkflownotificationweb/sapworkflownotificationweb ]$ zip -r app-deploy.zip . -x "node_modules/*" ".git/*" "*.zip"
  adding: newreadme.md (stored 0%)
  adding: package.json (deflated 34%)
  adding: main (stored 0%)
  adding: api/ (stored 0%)
  adding: api/triggercopy.js (deflated 69%)
  adding: api/trigger.js (deflated 70%)
  adding: api/triggerworkflowlocapro.js (deflated 73%)
  adding: api/trigger-workflowold.js (deflated 74%)
  adding: api/live/ (stored 0%)
  adding: api/live/trigger-workflow.js (deflated 76%)
  adding: api/trigger-workflow.js (deflated 74%)
  adding: api/teams-action.js (deflated 75%)
  adding: readme.txt (stored 0%)
  adding: package-lock.json (deflated 56%)
  adding: vercel copy.json (deflated 38%)
  adding: src/ (stored 0%)
  adding: src/utils/ (stored 0%)
  adding: src/utils/workflow.js (deflated 79%)
  adding: src/utils/workflow copy.js (deflated 80%)
  adding: src/utils/auth.js (deflated 52%)
  adding: src/config.js (deflated 54%)
  adding: .gitignore (deflated 40%)
  adding: package copy.json (deflated 38%)
  adding: public/ (stored 0%)
  adding: public/index.html (deflated 70%)
  adding: vercel.json (deflated 35%)
  adding: server.js (deflated 55%)
satya [ ~/sapworkflownotificationweb/sapworkflownotificationweb ]$ Deploy the zip file to the Azure App Service:
az webapp deploy \
  --resource-group sapworkflownotificationweb-rg \
  --name sapworkflownotificationweb-app \
  --src-path app-deploy.zip \
  --type zip
bash: Deploy: command not found
Initiating deployment
Deploying from local path: app-deploy.zip
Warming up Kudu before deployment.
Warmed up Kudu instance successfully.
Polling the status of sync deployment. Start Time: 2025-06-26 16:13:47.984709+00:00 UTC
Status: Build successful. Time: 0(s)
Status: Site started successfully. Time: 16(s)
Deployment has completed successfully
You can visit your app at: http://sapworkflownotificationweb-app-grbcetfbanh8bkhk.southeastasia-01.azurewebsites.net