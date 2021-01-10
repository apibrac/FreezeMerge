import express from "express";
import cors from "cors";

export function onSlackWebhook(action: (id: string) => void) {
  const app = express();

  app.use(cors({ origin: true }));

  app.get("/:id", async (req, res) => {
    await action(req.params.id);
    return res.sendStatus(200);
  });

  return app;
}
