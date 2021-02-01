import express from "express";
import cors from "cors";
import * as functions from "firebase-functions";

const SLACK_CHANNEL_ACCEPTED = 'freeze_merge'
const error_message = {
  "response_type": "in_channel",
  "text": `[ERREUR] Interdiction d'utiliser FreezeMerge dans ce channel. Il est utilisable uniquement dans le channel ${SLACK_CHANNEL_ACCEPTED}. Si vous n'y avez pas accès et en avez besoin, demandez à un responsable technique.`,
}

export function slackWebhook(action: (id: string, text: string) => any) {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.urlencoded({ extended: true }));

  app.post("/:id", async (req, res) => {
    if (req.body.channel_name !== SLACK_CHANNEL_ACCEPTED) {
      // We must return a 200 otherwise slack display a not explicit error that we can't customize
      return res.status(200).send(error_message)
    }
    const message = await action(req.params.id, req.body.text);
    return res.status(200).send(message);
  });

  return functions.https.onRequest(app);
}
