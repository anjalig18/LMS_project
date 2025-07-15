import React from 'react';
import { useParams } from 'react-router-dom';

export default function CourseDetails() {
  const { id } = useParams();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center text-2xl">
      <h1 className="text-blue-600 font-bold mb-4">📘 Course Details</h1>
      <p>Course ID: <span className="font-mono text-gray-700">{id}</span></p>
    </div>
  );
}
