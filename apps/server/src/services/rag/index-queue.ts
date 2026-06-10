import { createLogger } from "@folionote/log"

const log = createLogger({ prefix: "rag:index-queue" })

const DEFAULT_CONCURRENCY = 3
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

interface IndexTask {
  entryId: string
  userId: string
  retries: number
  enqueuedAt: number
}

type IndexWorkerFn = (entryId: string, userId: string) => Promise<void>

/**
 * In-memory async index queue with deduplication, concurrency control,
 * and exponential backoff retry.
 *
 * Same-entryId enqueues are coalesced (only the latest is kept).
 */
export class IndexQueue {
  private readonly pending = new Map<string, IndexTask>()
  private activeCount = 0
  private readonly concurrency: number
  private workerFn: IndexWorkerFn | undefined
  private drainTimer: ReturnType<typeof setTimeout> | undefined

  constructor(options?: { concurrency?: number }) {
    this.concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY
  }

  setWorker(fn: IndexWorkerFn) {
    this.workerFn = fn
  }

  enqueue(entryId: string, userId: string) {
    this.pending.set(entryId, {
      entryId,
      userId,
      retries: 0,
      enqueuedAt: Date.now()
    })
    this.scheduleDrain()
  }

  get stats() {
    return {
      pending: this.pending.size,
      active: this.activeCount
    }
  }

  private scheduleDrain() {
    if (this.drainTimer) {
      return
    }
    this.drainTimer = setTimeout(() => {
      this.drainTimer = undefined
      this.drain()
    }, 0)
  }

  private drain() {
    if (!this.workerFn) {
      return
    }

    while (this.activeCount < this.concurrency && this.pending.size > 0) {
      const [entryId, task] = this.pending.entries().next().value as [
        string,
        IndexTask
      ]
      this.pending.delete(entryId)
      this.activeCount += 1
      this.processTask(task)
    }
  }

  private async processTask(task: IndexTask) {
    try {
      await this.workerFn?.(task.entryId, task.userId)
      log.debug(`Indexed entry ${task.entryId}`)
    } catch (error) {
      if (task.retries < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * 2 ** task.retries
        log.warn(
          `Index failed for ${task.entryId} (attempt ${task.retries + 1}/${MAX_RETRIES}), retrying in ${delay}ms:`,
          error
        )
        setTimeout(() => {
          this.pending.set(task.entryId, {
            ...task,
            retries: task.retries + 1
          })
          this.scheduleDrain()
        }, delay)
      } else {
        log.error(
          `Index permanently failed for ${task.entryId} after ${MAX_RETRIES} retries:`,
          error
        )
      }
    } finally {
      this.activeCount -= 1
      this.scheduleDrain()
    }
  }
}

export const indexQueue = new IndexQueue()
