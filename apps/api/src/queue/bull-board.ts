import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ElysiaAdapter } from '@bull-board/elysia'
import { emailQueue, pdfQueue, webhookQueue, schedulerQueue, dlqQueue } from './index'

const serverAdapter = new ElysiaAdapter('/bull-board')

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(pdfQueue),
    new BullMQAdapter(webhookQueue),
    new BullMQAdapter(schedulerQueue),
    new BullMQAdapter(dlqQueue),
  ],
  serverAdapter,
})

export const bullBoard = serverAdapter
