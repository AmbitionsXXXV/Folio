import "dotenv/config"
import "../env"
import { createLogger } from "@folionote/log"

import { indexQueue } from "../services/rag"
import { collabServer, setCollabContentChangeListener } from "./server"

const log = createLogger({ prefix: "collab" })

// Same embedding-reindex trigger the main server wires for solo saves
// (setContentChangeListener in ../index.ts) — this process needs its own
// registration since collab flushes never go through entries.update.
setCollabContentChangeListener((entryId, userId) => {
  indexQueue.enqueue(entryId, userId)
})

await collabServer.listen()

const port = process.env.COLLAB_PORT || 3002
log.info(`Collab server is running on ws://localhost:${port}`)
// Tell PM2 (ecosystem `wait_ready`) the process is accepting traffic.
process.send?.("ready")
