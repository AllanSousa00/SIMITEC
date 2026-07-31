import dotenv from "dotenv";

dotenv.config();

const { resolveAppUrl, sendSmtpTestEmail, verifySmtpConnection } = await import("../src/services/mailer.js");

try {
  const status = await verifySmtpConnection();

  if (!status.configured) {
    console.error("SMTP incompleto. Confira SMTP_HOST, SMTP_USER e SMTP_PASS no arquivo .env.");
    process.exitCode = 1;
  } else {
    console.log("SMTP autenticado com sucesso.");
    console.log(`Links de e-mail: ${resolveAppUrl()}`);

    if (process.argv.includes("--send")) {
      const delivery = await sendSmtpTestEmail();

      if (!delivery.delivered) {
        throw new Error("O SMTP foi autenticado, mas o e-mail de teste nao foi enviado.");
      }

      console.log("E-mail de teste enviado para a conta SMTP oficial.");
    }
  }
} catch (error) {
  console.error(`Falha ao validar SMTP: ${error.message}`);
  process.exitCode = 1;
}
