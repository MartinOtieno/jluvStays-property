export default function ReviewList({ reviews }: any) {
  if (!reviews || reviews.length === 0) {
    return (
      <p className="text-gray-500">
        No reviews yet. Be the first to review this room.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((r: any) => (
        <div key={r._id} className="border p-4 rounded-lg">
          <p className="font-bold">
            {r.user?.name || "Anonymous"}
          </p>
          <p>⭐ {r.rating}/5</p>
          <p className="text-gray-600">{r.comment}</p>
        </div>
      ))}
    </div>
  );
}