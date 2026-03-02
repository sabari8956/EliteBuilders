import { NextResponse } from "next/server";
import { fail, ok } from "@/features/api/envelope";
import { requireAuth } from "@/features/auth/authorization";
import { getChallengeRecord } from "@/features/challenges/repository";
import { listSubmissionRecords } from "@/features/submissions/repository";

type Params = { id: string };

/**
 * GET /api/challenges/[id]/submissions
 * Returns all submissions for a challenge.
 * Accessible by: sponsor (own challenges only) and admin (all).
 */
export async function GET(_request: Request, context: { params: Promise<Params> }) {
    const auth = await requireAuth(["sponsor", "admin"], "/api/challenges/:id/submissions");

    if ("response" in auth) {
        return NextResponse.json(auth.response, { status: auth.status });
    }

    const { id } = await context.params;

    // Load challenge to verify ownership for sponsor role
    let challenge;
    try {
        challenge = await getChallengeRecord(id);
    } catch (error) {
        console.error("CHALLENGE_SUBMISSIONS_READ_CHALLENGE_ERROR", error);
        return NextResponse.json(fail("INTERNAL_ERROR", "Unable to load challenge."), { status: 500 });
    }

    if (!challenge) {
        return NextResponse.json(fail("NOT_FOUND", "Challenge not found."), { status: 404 });
    }

    // Sponsors can only see submissions for their own challenges
    if (auth.user.role === "sponsor" && challenge.sponsorId !== auth.user.id) {
        return NextResponse.json(fail("FORBIDDEN", "You are not allowed to view submissions for this challenge."), { status: 403 });
    }

    try {
        const items = await listSubmissionRecords({ challengeId: id });
        return NextResponse.json(ok({ challenge: { id: challenge.id, title: challenge.title }, items, count: items.length }));
    } catch (error) {
        console.error("CHALLENGE_SUBMISSIONS_LIST_ERROR", error);
        return NextResponse.json(fail("INTERNAL_ERROR", "Unable to list submissions."), { status: 500 });
    }
}
