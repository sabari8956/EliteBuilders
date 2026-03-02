import { NextResponse } from "next/server";
import { getStore, nextId, nowIso } from "@/features/platform/store";

export async function GET() {
    const store = getStore();
    const cid = nextId("chl");
    store.challenges.set(cid, {
        id: cid,
        title: "Demo Challenge",
        brief: "Build a cool thing.",
        rubric: { functionality: 100 },
        deadline: new Date(Date.now() + 86400000).toISOString(),
        prize: "$100x",
        sponsorId: "usr_123",
        status: "published",
        createdAt: nowIso(),
        updatedAt: nowIso(),
        publishedAt: nowIso()
    });
    return NextResponse.json({ challengeId: cid });
}
