import type { FastifyReply } from "fastify";

import {
  type GoogleApiQuotaReject,
  quotaExceededMessage,
} from "./googleApiQuota.js";

export function sendGoogleQuotaExceeded(
  reply: FastifyReply,
  reject: GoogleApiQuotaReject,
): void {
  void reply.status(429).send({
    error: quotaExceededMessage(reject),
    code: "GOOGLE_API_QUOTA_EXCEEDED",
    kind: reject.kind,
    limit: reject.limit,
    used: reject.used,
  });
}
