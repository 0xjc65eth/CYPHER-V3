# Rate Limiting Implementation Guide

## ⚠️ IMPORTANT: Edge Runtime Limitation

Next.js middleware runs in **Edge Runtime**, which does NOT support:
- Node.js APIs (fs, path, crypto.randomBytes, etc.)
- Native modules like `ioredis`
- Most npm packages that depend on Node.js

**Solution**: Use rate limiting **inside API routes**, not in middleware.

---

## Option 1: Full Rate Limiter (Recommended for Production)

**File**: `/src/lib/middleware/rate-limiter.ts`

**Features**:
- ✅ Redis-backed (distributed)
- ✅ In-memory fallback
- ✅ Works in Node.js runtime (API routes)
- ❌ NOT compatible with Edge Runtime (middleware)

**Usage in API Routes**:

```typescript
// /src/app/api/your-endpoint/route.ts
import { NextRequest } from 'next/server';
import { rateLimit, createSafeBigIntResponse } from '@/lib/middleware/rate-limiter';

export async function GET(request: NextRequest) {
  // Apply rate limiting FIRST
  const rateLimitResponse = await rateLimit(request, 100, 60);
  if (rateLimitResponse) return rateLimitResponse;

  // Handle request normally
  const data = await fetchYourData();
  return createSafeBigIntResponse(data);
}
```

---

## Option 2: Edge Rate Limiter (For Middleware)

**File**: `/src/lib/middleware/edge-rate-limiter.ts`

**Features**:
- ✅ Edge Runtime compatible
- ✅ No dependencies (pure in-memory)
- ⚠️ NOT distributed (resets on restart)
- ⚠️ NOT shared across instances

**Usage in Middleware** (NOT RECOMMENDED):

```typescript
// /src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { edgeRateLimit } from '@/lib/middleware/edge-rate-limiter';

export function middleware(request: NextRequest) {
  // Only for non-critical rate limiting
  if (request.nextUrl.pathname.startsWith('/api/public/')) {
    const rateLimitResponse = edgeRateLimit(request, 100, 60);
    if (rateLimitResponse) return rateLimitResponse;
  }

  return NextResponse.next();
}
```

**⚠️ WARNING**: Edge rate limiter is NOT suitable for production because:
- Resets on every deployment
- Not shared across instances (load balancer will bypass it)
- Limited to in-memory storage only

---

## Recommended Approach

### For Production (Multi-instance):
Use **rate-limiter.ts** inside **API routes**:

1. Create a wrapper utility:
```typescript
// /src/lib/api/with-rate-limit.ts
import { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/middleware/rate-limiter';

export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<Response>,
  limit = 100,
  windowSeconds = 60
) {
  const rateLimitResponse = await rateLimit(request, limit, windowSeconds);
  if (rateLimitResponse) return rateLimitResponse;

  return handler();
}
```

2. Use in every API route:
```typescript
// /src/app/api/ordinals/route.ts
import { NextRequest } from 'next/server';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { createSafeBigIntResponse } from '@/lib/utils/bigint-serializer';

export async function GET(request: NextRequest) {
  return withRateLimit(request, async () => {
    const data = await fetchOrdinals();
    return createSafeBigIntResponse(data);
  });
}
```

### For Development (Single-instance):
Either approach works, but prefer API route rate limiting for consistency.

---

## Migration from Middleware

If you previously added rate limiting to middleware.ts and got errors:

```bash
# Error: Cannot read properties of undefined (reading 'charCodeAt')
# This means ioredis tried to load in Edge Runtime
```

**Fix**:
1. Remove rate limiting from `/src/middleware.ts`
2. Apply rate limiting inside each API route instead
3. Use the wrapper utility above for consistency

---

## Testing Rate Limiting

```bash
# Test with curl (should get 429 after 100 requests)
for i in {1..110}; do
  curl http://localhost:4444/api/health
  echo "Request $i"
done

# You should see:
# Request 1-100: Success (200)
# Request 101-110: Rate limited (429)
```

---

## Performance Considerations

**Redis version** (rate-limiter.ts):
- ✅ Distributed across instances
- ✅ Persists across restarts
- ✅ Production-ready
- ⚠️ Requires Redis connection
- ⚠️ Slightly slower (~5ms overhead)

**Edge version** (edge-rate-limiter.ts):
- ✅ No external dependencies
- ✅ Very fast (<1ms overhead)
- ❌ Not distributed
- ❌ Resets on restart
- ❌ Development only

---

## Summary

| Feature | rate-limiter.ts | edge-rate-limiter.ts |
|---------|----------------|----------------------|
| **Runtime** | Node.js (API routes) | Edge (middleware) |
| **Storage** | Redis + in-memory | In-memory only |
| **Distributed** | ✅ Yes | ❌ No |
| **Production** | ✅ Recommended | ❌ Not recommended |
| **Use Case** | All API routes | Development/demos |

**Recommendation**: Always use `rate-limiter.ts` inside API routes for production.
