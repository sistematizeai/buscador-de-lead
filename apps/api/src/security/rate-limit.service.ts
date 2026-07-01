import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

interface Bucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, Bucket>();

  assertAllowed(key: string, limit: number, windowMs: number, message = "Muitas tentativas. Aguarde e tente novamente.") {
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    current.count += 1;
    if (current.count > limit) {
      throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
