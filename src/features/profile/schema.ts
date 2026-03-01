import { z } from "zod";

export const profileSchema = z.object({
  githubUrl: z.url("GitHub URL must be a valid URL.").refine((url) => url.includes("github.com"), {
    message: "GitHub URL must point to github.com.",
  }),
  portfolioUrl: z.url("Portfolio URL must be a valid URL."),
  cvMetadata: z.string().max(250).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
