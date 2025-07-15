import React from 'react';

export default function CourseCard({ title, description, price }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
      <p className="mt-2 text-green-600 font-bold">₹{price}</p>
    </div>
  );
}
