# @folionote/utils

Shared utility functions for FolioNote applications.

## Installation

This package is part of the FolioNote monorepo and is installed as a workspace dependency:

```json
{
  "dependencies": {
    "@folionote/utils": "workspace:*"
  }
}
```

## Features

### Time Formatting

Intelligent time formatting utilities with i18n integration.

#### `formatTime(seconds, options?)`

Format seconds into a human-friendly time representation.

```typescript
import { formatTime } from "@folionote/utils"

// Basic usage
formatTime(30) // { value: 30, unit: 'second' }
formatTime(90) // { value: 2, unit: 'minute' }
formatTime(3600) // { value: 1, unit: 'hour' }
formatTime(86400) // { value: 1, unit: 'day' }

// Limit maximum unit
formatTime(86400, { maxUnit: "hour" }) // { value: 24, unit: 'hour' }

// Precise values (no rounding)
formatTime(90, { precise: true }) // { value: 1.5, unit: 'minute' }
```

#### `formatTimeWithI18n(seconds, t, options?)`

Format time with automatic i18n translation.

```typescript
import { formatTimeWithI18n } from '@folionote/utils'
import { useTranslation } from 'react-i18next'

function RateLimitMessage({ seconds }: { seconds: number }) {
  const { t } = useTranslation()

  const { value, unit } = formatTimeWithI18n(seconds, t, { maxUnit: 'hour' })

  return (
    <p>
      {t('avatar.rateLimitedWait', { value, unit })}
    </p>
  )
}
```

#### `formatRateLimitTime(seconds)` (Legacy)

Backward-compatible function for rate limit formatting. Automatically limits to hours.

```typescript
import { formatRateLimitTime } from "@folionote/utils"

formatRateLimitTime(120) // { value: 2, unit: 'minute' }
formatRateLimitTime(7200) // { value: 2, unit: 'hour' }
```

#### `getTzOffset()`

Get the current timezone offset in minutes. Returns a positive value for timezones ahead of UTC, negative for behind.

```typescript
import { getTzOffset } from "@folionote/utils"

getTzOffset() // 480 for UTC+8 (Beijing, China)
getTzOffset() // -300 for UTC-5 (New York, USA)
getTzOffset() // 0 for UTC (London, UK)
```

This is useful for sending timezone-aware requests to the server:

```typescript
import { getTzOffset } from "@folionote/utils"

// Fetch due reviews for the user's timezone
const dueStats = await api.review.getDueStats({
  tzOffset: getTzOffset()
})
```

## Type Definitions

```typescript
type TimeUnit = "second" | "minute" | "hour" | "day"

interface FormattedTime {
  value: number
  unit: TimeUnit
}

interface FormatTimeOptions {
  precise?: boolean // Default: false (rounds up)
  maxUnit?: TimeUnit // Default: 'day'
}
```

## i18n Integration

The time units expect the following i18n keys structure:

```json
{
  "avatar": {
    "timeUnit": {
      "second": "second",
      "minute": "minute",
      "hour": "hour",
      "day": "day"
    }
  }
}
```

Chinese example:

```json
{
  "avatar": {
    "timeUnit": {
      "second": "秒",
      "minute": "分钟",
      "hour": "小时",
      "day": "天"
    }
  }
}
```

## Examples

### Avatar Upload Rate Limiting

```typescript
import { formatTimeWithI18n } from '@folionote/utils'
import { useTranslation } from 'react-i18next'

function AvatarUploader() {
  const { t } = useTranslation()
  const countdown = 120 // seconds

  const { value, unit } = formatTimeWithI18n(countdown, t, { maxUnit: 'hour' })

  return (
    <Alert>
      {t('avatar.rateLimitedWait', { value, unit })}
      {/* Output: "Please wait 2 minutes" (English) */}
      {/* Output: "请等待 2 分钟" (Chinese) */}
    </Alert>
  )
}
```

### Custom Namespace

```typescript
const { value, unit } = formatTimeWithI18n(seconds, t, {
  namespace: "common", // Uses 'common.timeUnit.minute' instead of 'avatar.timeUnit.minute'
  maxUnit: "hour"
})
```

## Benefits

- **DRY**: Single source of truth for time formatting logic
- **Type-safe**: Full TypeScript support with type inference
- **i18n-ready**: Built-in internationalization support
- **Flexible**: Multiple formatting options and units
- **Tested**: Centralized logic makes testing easier
- **Consistent**: Same formatting across web and native apps
