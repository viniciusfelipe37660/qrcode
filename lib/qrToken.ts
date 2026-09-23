import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * O QR code NÃO deve conter só o registrationId puro — senão qualquer pessoa
 * que descubra o formato consegue forjar um QR válido para outro id.
 *
 * Formato do token: "<registrationId>.<random>.<assinatura>"
 * A assinatura é um HMAC-SHA256 de "<registrationId>.<random>" usando um
 * segredo do servidor (QR_TOKEN_SECRET). Isso garante que o token só pode
 * ter sido gerado por quem tem o segredo.
 */

const SECRET = process.env.QR_TOKEN_SECRET;

if (!SECRET) {
  throw new Error("QR_TOKEN_SECRET não configurado no .env");
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET as string).update(payload).digest("hex");
}

export function generateQrToken(registrationId: string): string {
  const nonce = randomBytes(8).toString("hex");
  const payload = `${registrationId}.${nonce}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifyQrToken(
  token: string
): { valid: true; registrationId: string } | { valid: false; reason: string } {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "Formato de token inválido" };
  }

  const [registrationId, nonce, signature] = parts;
  const payload = `${registrationId}.${nonce}`;
  const expectedSignature = sign(payload);

  // Comparação em tempo constante evita timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return { valid: false, reason: "Assinatura inválida" };
  }

  return { valid: true, registrationId };
}
