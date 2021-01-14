import express from "express";
import cors from "cors";

export function onSlackWebhook(action: (id: string, text: string) => void) {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.urlencoded({ extended: true }));

  app.post("/:id", async (req, res) => {
    await action(req.params.id, req.body.text);
    return res.sendStatus(200);
  });

  return app;
}
