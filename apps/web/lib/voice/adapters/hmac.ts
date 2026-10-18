import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verificação genérica de assinaturas HMAC para webhooks.
 *
 * Utilitário neutro do fornecedor: cada adaptador define o cabeçalho e o
 * esquema exatos CONFORME A DOCUMENTAÇÃO OFICIAL do fornecedor (não
 * inventados). Nenhum esquema de fornecedor está implementado aqui.
 */

export type HmacAlgorithm = 'sha1' | 'sha256' | 'sha512';

export interface HmacSignatureParams {
  /** Corpo cru exatamente como recebido (nunca re-serializado). */
  rawBody: string;
  /** Valor do cabeçalho de assinatura. */
  signature: string | undefined;
  /** Segredo de assinatura (servidor apenas). */
  secret: string;
  algorithm: HmacAlgorithm;
}

export function computeHmacSignature(params: {
  rawBody: string;
  secret: string;
  algorithm: HmacAlgorithm;
}): string {
  return createHmac(params.algorithm, params.secret).update(params.rawBody, 'utf8').digest('hex');
}

/** Comparação em tempo constante, tolerante a prefixos comuns (`sha256=`). */
export function verifyHmacSignature(params: HmacSignatureParams): boolean {
  if (!params.signature || !params.secret || params.secret.length === 0) return false;

  const expected = computeHmacSignature({
    rawBody: params.rawBody,
    secret: params.secret,
    algorithm: params.algorithm,
  });

  const provided = params.signature.replace(/^(sha1=|sha256=|sha512=)/i, '').trim();

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(provided, 'utf8');
  if (expectedBuffer.length !== providedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

/** Janela de replay: rejeita timestamps assinados fora do intervalo. */
export function isWithinReplayWindow(
  timestampSeconds: number | undefined,
  nowSeconds: number,
  windowSeconds: number,
): boolean {
  if (timestampSeconds === undefined || !Number.isFinite(timestampSeconds)) return false;
  return Math.abs(nowSeconds - timestampSeconds) <= windowSeconds;
}
