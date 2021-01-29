# Create a github FreezeMerge App

## Create a firebase project

Create projetct
Get url for github app

## Create a github app

Follow these steps https://docs.github.com/en/developers/apps/creating-a-github-app

Step 12) Use the url from previous steps

Step 14) You need to give :

- "Checks" => "Read and Write"
- "Pull requests" => "Read-Only"

Step 15) Suscribe to "Pull requests" events

You will get the GITHUB_APP_ID, GITHUB_WEBHOOK_SECRET and GITHUB_PRIVATE_KEY for next step

## Give firebase project access to the github app

firebase functions:config:set github.app_id="GITHUB_APP_ID" github.webhook_secret="GITHUB_WEBHOOK_SECRET" github.private_key="GITHUB_PRIVATE_KEY"

# Install an app on a github repo (= consummer)

# Commend an app from slack (= controller)
