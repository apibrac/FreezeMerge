import * as functions from "firebase-functions";

export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", { structuredData: true });
  functions.logger.info("Request", request);
  functions.logger.info("Request.body", request.body);
  response.send("Hello pibou!");
});
