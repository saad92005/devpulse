import type { Metadata } from "next";
import { ReviewList } from "@/components/review-list";
import { listReviews } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  const session = (await getSession())!;
  const reviews = await listReviews(session.uid, { limit: 100 });
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
      <p className="mt-1 text-sm text-muted">Every pull request DevPulse has reviewed, newest first.</p>
      <div className="mt-8">
        {reviews.length ? (
          <ReviewList reviews={reviews} />
        ) : (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">No reviews yet.</div>
        )}
      </div>
    </div>
  );
}
