import { eq } from 'drizzle-orm'
import { db } from '@entityseven/db'

// Import queue workers once configured
// import { emailWorker } from './queue/workers/email.worker'

console.log('🚀 Entity Seven Worker Instance Started')

// Placeholder for queue workers initialization
// Make sure this keeps the process alive
process.on('SIGINT', () => {
    console.log('Shutting down worker process...')
    process.exit(0)
})
