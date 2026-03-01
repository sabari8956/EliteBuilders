import { z } from "zod";

export const submissionCreateSchema = z.object({
  challengeId: z.string().min(1),
  snapshotRef: z.string().min(1),
});
