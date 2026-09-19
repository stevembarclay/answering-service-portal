import { z } from 'zod'

export const PatchMessageSchema = z
  .object({
    priority: z.enum(['high', 'medium', 'low']).optional(),
    portalStatus: z.enum(['new', 'read', 'flagged_qa', 'assigned', 'resolved']).optional(),
  })
  .refine((data) => data.priority !== undefined || data.portalStatus !== undefined, {
    message: 'At least one of priority or portalStatus must be provided',
  })

export type PatchMessageInput = z.infer<typeof PatchMessageSchema>
