import { App } from "@blazjs/common";
import { BullQueueRoute } from "@blazjs/queue";
import Container from "typedi";
import { AppConfig } from "./app";
import { DiscountOfferJobProcessor } from "./discount.processor";
import { EmailCronJobProcessor } from "./email-cron.processor";
import { EmailJobProcessor } from "./email.prossesor";

async function bootstrap() {
  Container.get(AppConfig).validate();

  const app = new App();

  const discountProcessor = Container.get(DiscountOfferJobProcessor);
  discountProcessor.spawn();

  // send welcome email
  const mailProcessor = Container.get(EmailJobProcessor);
  // after process welcome mail, fanout discount offer job to discount processor
  mailProcessor.out([discountProcessor.queue]);
  mailProcessor.spawn();

  // cron job to send welcome mail every 5 seconds
  const cronMailProcessor = Container.get(EmailCronJobProcessor);
  await cronMailProcessor.cron({
    every: 5000,
  });
  cronMailProcessor.out([mailProcessor.queue]);
  cronMailProcessor.spawn();

  const queueRoute = new BullQueueRoute(
    [mailProcessor, cronMailProcessor, discountProcessor],
    { users: { admin: "password" } }
  );

  app.registerRoutes({ routes: [queueRoute] });
  await app.listen(3000);
}

bootstrap();
