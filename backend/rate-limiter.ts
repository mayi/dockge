// "limit" is bugged in Typescript, use "limiter-es6-compat" instead
// See https://github.com/jhurliman/node-rate-limiter/issues/80
import { RateLimiter, RateLimiterOpts } from "limiter-es6-compat";
import { log } from "./log";

export interface KumaRateLimiterOpts extends RateLimiterOpts {
    errorMessage : string;
    maxBuckets? : number;
}

export type KumaRateLimiterCallback = (err : object) => void;

class KumaRateLimiter {

    errorMessage : string;
    rateLimiter : RateLimiter;

    /**
     * @param {object} config Rate limiter configuration object
     */
    constructor(config : KumaRateLimiterOpts) {
        this.errorMessage = config.errorMessage;
        this.rateLimiter = new RateLimiter(config);
    }

    /**
     * Should the request be passed through
     * @param callback Callback function to call with decision
     * @param {number} num Number of tokens to remove
     * @returns {Promise<boolean>} Should the request be allowed?
     */
    async pass(callback : KumaRateLimiterCallback, num = 1) {
        const remainingRequests = await this.removeTokens(num);
        log.info("rate-limit", "remaining requests: " + remainingRequests);
        if (remainingRequests < 0) {
            if (callback) {
                callback({
                    ok: false,
                    msg: this.errorMessage,
                });
            }
            return false;
        }
        return true;
    }

    /**
     * Remove a given number of tokens
     * @param {number} num Number of tokens to remove
     * @returns {Promise<number>} Number of remaining tokens
     */
    async removeTokens(num = 1) {
        return await this.rateLimiter.removeTokens(num);
    }
}

/**
 * Per-IP rate limiter that creates a separate bucket for each IP address.
 * Automatically cleans up stale buckets to prevent memory leaks.
 */
class PerIPRateLimiter {
    private buckets : Map<string, { limiter: KumaRateLimiter, lastAccess: number }> = new Map();
    private config : KumaRateLimiterOpts;
    private maxBuckets : number;
    private cleanupInterval? : ReturnType<typeof setInterval>;

    constructor(config : KumaRateLimiterOpts) {
        this.config = config;
        this.maxBuckets = config.maxBuckets || 1000;

        // Cleanup stale buckets every 5 minutes
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [ip, bucket] of this.buckets) {
                if (now - bucket.lastAccess > 5 * 60 * 1000) {
                    this.buckets.delete(ip);
                }
            }
        }, 5 * 60 * 1000);
    }

    private getBucket(ip : string) : KumaRateLimiter {
        let bucket = this.buckets.get(ip);
        if (!bucket) {
            // Evict oldest bucket if at capacity
            if (this.buckets.size >= this.maxBuckets) {
                let oldestKey : string | undefined;
                let oldestTime = Infinity;
                for (const [key, val] of this.buckets) {
                    if (val.lastAccess < oldestTime) {
                        oldestTime = val.lastAccess;
                        oldestKey = key;
                    }
                }
                if (oldestKey) {
                    this.buckets.delete(oldestKey);
                }
            }
            bucket = {
                limiter: new KumaRateLimiter(this.config),
                lastAccess: Date.now(),
            };
            this.buckets.set(ip, bucket);
        }
        bucket.lastAccess = Date.now();
        return bucket.limiter;
    }

    async pass(ip : string, callback : KumaRateLimiterCallback, num = 1) : Promise<boolean> {
        return await this.getBucket(ip).pass(callback, num);
    }
}

export const loginRateLimiter = new PerIPRateLimiter({
    tokensPerInterval: 20,
    interval: "minute",
    fireImmediately: true,
    errorMessage: "Too frequently, try again later."
});

export const apiRateLimiter = new KumaRateLimiter({
    tokensPerInterval: 60,
    interval: "minute",
    fireImmediately: true,
    errorMessage: "Too frequently, try again later."
});

export const twoFaRateLimiter = new PerIPRateLimiter({
    tokensPerInterval: 30,
    interval: "minute",
    fireImmediately: true,
    errorMessage: "Too frequently, try again later."
});
