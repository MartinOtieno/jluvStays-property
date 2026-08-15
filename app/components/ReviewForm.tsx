"use client";

import { useState } from "react";

export default function ReviewForm({ roomId, userId }: never) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const submitReview = async () => {
    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: userId,
        room: roomId,
        rating,
        comment,
      }),
    });

    setComment("");
    alert("Review submitted!");
  };

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="font-bold mb-2">Leave a Review</h2>

      {/* Rating */}
      <select
        value={rating}
        onChange={(e) => setRating(Number(e.target.value))}
        className="border p-2 mb-2"
      >
        {[5, 4, 3, 2, 1].map((r) => (
          <option key={r} value={r}>
            {r} Stars
          </option>
        ))}
      </select>

      {/* Comment */}
      <textarea
        className="w-full border p-2"
        placeholder="Write your review..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      <button
        onClick={submitReview}
        className="mt-2 bg-blue-600 text-white px-4 py-2 rounded"
      >
        Submit
      </button>
    </div>
  );
}