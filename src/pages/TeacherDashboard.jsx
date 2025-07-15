import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getDocs, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function TeacherDashboard() {
  const { user } = useAuth();

  // Course state
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({
    title: '',
    details: '',
    price: '',
    file: null,
  });

  // Edit course state
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    details: '',
    price: '',
  });

  // Test feature states
  const [tests, setTests] = useState([]);
  const [testForm, setTestForm] = useState({
    title: '',
    questions: [
      { question: '', options: ['', '', '', ''], answer: 0 }
    ]
  });
  const [attemptTestId, setAttemptTestId] = useState(null);
  const [attemptAnswers, setAttemptAnswers] = useState([]);
  const [timer, setTimer] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const [loading, setLoading] = useState(true);

  // Real-time listener for courses
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'courses'), (snapshot) => {
      const coursesData = [];
      snapshot.forEach((doc) => {
        coursesData.push({ id: doc.id, ...doc.data() });
      });
      // Sort by upload date (newest first)
      coursesData.sort((a, b) => {
        const dateA = a.uploadDate?.toDate?.() || new Date(a.uploadDate);
        const dateB = b.uploadDate?.toDate?.() || new Date(b.uploadDate);
        return dateB - dateA;
      });
      setCourses(coursesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for tests
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tests'), (snapshot) => {
      const testsData = [];
      snapshot.forEach((doc) => {
        testsData.push({ id: doc.id, ...doc.data() });
      });
      setTests(testsData);
    });

    return () => unsubscribe();
  }, []);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  // Add new course to Firebase
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.price) return;
    
    try {
      await addDoc(collection(db, 'courses'), {
        title: form.title,
        details: form.details,
        price: Number(form.price),
        uploadDate: serverTimestamp(),
        uploadedBy: user.uid,
        uploaderEmail: user.email,
        uploaderRole: 'teacher',
        premium: Number(form.price) > 0,
        fileUrl: '#' // In real app, upload file to Firebase Storage
      });
      
      setForm({ title: '', details: '', price: '', file: null });
      alert('Course uploaded successfully!');
    } catch (error) {
      console.error('Error uploading course:', error);
      alert('Error uploading course. Please try again.');
    }
  };

  // Start editing
  const editCourse = (id) => {
    const course = courses.find((c) => c.id === id);
    if (course.uploadedBy !== user.uid) {
      alert('You can only edit your own courses!');
      return;
    }
    setEditId(id);
    setEditForm({
      title: course.title,
      details: course.details,
      price: course.price,
    });
  };

  // Handle edit input
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Save edit to Firebase
  const saveEdit = async (id) => {
    try {
      await updateDoc(doc(db, 'courses', id), {
        title: editForm.title,
        details: editForm.details,
        price: Number(editForm.price),
        premium: Number(editForm.price) > 0,
        lastModified: serverTimestamp(),
        lastModifiedBy: user.uid
      });
      setEditId(null);
      alert('Course updated successfully!');
    } catch (error) {
      console.error('Error updating course:', error);
      alert('Error updating course. Please try again.');
    }
  };

  // Cancel edit
  const cancelEdit = () => setEditId(null);

  // Delete course from Firebase
  const deleteCourse = async (id) => {
    const course = courses.find(c => c.id === id);
    if (course.uploadedBy !== user.uid) {
      alert('You can only delete your own courses!');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await deleteDoc(doc(db, 'courses', id));
        alert('Course deleted successfully!');
      } catch (error) {
        console.error('Error deleting course:', error);
        alert('Error deleting course. Please try again.');
      }
    }
  };

  // Test form handlers
  const handleTestFormChange = (e, qIdx, optIdx) => {
    const { name, value } = e.target;
    setTestForm(prev => {
      const updated = { ...prev };
      if (name === 'title') {
        updated.title = value;
      } else if (name === 'question') {
        updated.questions[qIdx].question = value;
      } else if (name === 'option') {
        updated.questions[qIdx].options[optIdx] = value;
      } else if (name === 'answer') {
        updated.questions[qIdx].answer = Number(value);
      }
      return { ...updated };
    });
  };

  const addQuestion = () => {
    setTestForm(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        { question: '', options: ['', '', '', ''], answer: 0 }
      ]
    }));
  };

  const handleTestSubmit = async (e) => {
    e.preventDefault();
    if (!testForm.title) return;
    
    try {
      await addDoc(collection(db, 'tests'), {
        ...testForm,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        creatorEmail: user.email,
        creatorRole: 'teacher'
      });
      
      setTestForm({
        title: '',
        questions: [
          { question: '', options: ['', '', '', ''], answer: 0 }
        ]
      });
      alert('Test created successfully!');
    } catch (error) {
      console.error('Error creating test:', error);
      alert('Error creating test. Please try again.');
    }
  };

  // Delete test
  const deleteTest = async (testId) => {
    const test = tests.find(t => t.id === testId);
    if (test.createdBy !== user.uid) {
      alert('You can only delete your own tests!');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this test?')) {
      try {
        await deleteDoc(doc(db, 'tests', testId));
        alert('Test deleted successfully!');
      } catch (error) {
        console.error('Error deleting test:', error);
        alert('Error deleting test. Please try again.');
      }
    }
  };

  // Attempt test handlers (for preview)
  const startAttempt = (testId) => {
    setAttemptTestId(testId);
    setAttemptAnswers(Array(tests.find(t => t.id === testId).questions.length).fill(null));
    setShowResult(false);
    setScore(0);
    setTimer(60); // 60 seconds for demo
  };

  useEffect(() => {
    let interval = null;
    if (attemptTestId && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    if (timer === 0 && attemptTestId) {
      handleSubmitAttempt();
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [attemptTestId, timer]);

  const handleAttemptChange = (qIdx, value) => {
    setAttemptAnswers(prev => {
      const updated = [...prev];
      updated[qIdx] = Number(value);
      return updated;
    });
  };

  const handleSubmitAttempt = () => {
    const test = tests.find(t => t.id === attemptTestId);
    let correct = 0;
    test.questions.forEach((q, idx) => {
      if (attemptAnswers[idx] === q.answer) correct++;
    });
    setScore(correct);
    setShowResult(true);
    setAttemptTestId(null);
    setTimer(0);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  // Filter courses uploaded by current teacher
  const teacherCourses = courses.filter(course => course.uploadedBy === user?.uid);
  const teacherTests = tests.filter(test => test.createdBy === user?.uid);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h2 className="text-3xl font-bold text-purple-800 mb-2">Teacher Dashboard</h2>
      <p className="text-gray-600 mb-6">Welcome, {user?.email}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Course Section */}
        <div className="bg-white p-6 shadow rounded-xl">
          <h3 className="text-xl font-semibold mb-4">Upload New Course</h3>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Course Title"
              className="w-full px-4 py-2 border rounded"
              required
            />
            <textarea
              name="details"
              value={form.details}
              onChange={handleChange}
              placeholder="Course Details"
              className="w-full px-4 py-2 border rounded"
              rows="3"
            />
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              placeholder="Price (0 for free)"
              className="w-full px-4 py-2 border rounded"
              required
              min="0"
            />
            <input
              type="file"
              name="file"
              className="w-full"
              accept="video/*,application/pdf"
              onChange={handleChange}
            />
            <button className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700" type="submit">
              Upload Course
            </button>
          </form>
        </div>

        {/* View Your Courses */}
        <div className="bg-white p-6 shadow rounded-xl">
          <h3 className="text-xl font-semibold mb-4">Your Courses ({teacherCourses.length})</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {teacherCourses.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                <p>No courses uploaded yet.</p>
                <p className="text-sm">Upload your first course to get started!</p>
              </div>
            ) : (
              teacherCourses.map((course) => (
                <div key={course.id} className="border rounded-lg p-4">
                  {editId === course.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        name="title"
                        value={editForm.title}
                        onChange={handleEditChange}
                        className="w-full border px-3 py-2 rounded"
                        placeholder="Course Title"
                      />
                      <input
                        type="number"
                        name="price"
                        value={editForm.price}
                        onChange={handleEditChange}
                        className="w-full border px-3 py-2 rounded"
                        placeholder="Price"
                        min="0"
                      />
                      <textarea
                        name="details"
                        value={editForm.details}
                        onChange={handleEditChange}
                        className="w-full border px-3 py-2 rounded"
                        placeholder="Course Details"
                        rows="3"
                      />
                      <div className="flex space-x-2">
                        <button
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                          onClick={() => saveEdit(course.id)}
                        >
                          Save
                        </button>
                        <button
                          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-semibold text-lg mb-2">{course.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{course.details}</p>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          <span>Uploaded: {formatDate(course.uploadDate)}</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
                            course.premium ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {course.premium ? `₹${course.price}` : 'Free'}
                          </span>
                        </div>
                        <div className="space-x-2">
                          <button
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                            onClick={() => editCourse(course.id)}
                          >
                            Edit
                          </button>
                          <button
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            onClick={() => deleteCourse(course.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* All Courses (Read-only view) */}
      <div className="mt-6 bg-white rounded-xl shadow p-6">
        <h4 className="text-lg font-semibold mb-4">All Courses in System ({courses.length})</h4>
        <div className="text-sm text-gray-600 mb-4">
          View all courses uploaded by teachers and admins. You can only edit/delete your own courses.
        </div>
        {courses.length === 0 ? (
          <p className="text-gray-400">No courses in the system yet.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {courses.map(course => (
              <div key={course.id} className="border rounded p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h5 className="font-semibold text-lg">{course.title}</h5>
                    <p className="text-sm text-gray-600 mb-1">{course.details}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Uploaded: {formatDate(course.uploadDate)}</span>
                      <span>By: {course.uploaderEmail}</span>
                      <span>Role: {course.uploaderRole}</span>
                    </div>
                    <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-bold ${
                      course.premium ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {course.premium ? `Premium ₹${course.price}` : 'Free'}
                    </span>
                  </div>
                  {course.uploadedBy === user?.uid && (
                    <span className="ml-4 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      Your Course
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Feature */}
      <div className="mt-10 bg-white p-6 shadow rounded-xl">
        <h3 className="text-xl font-semibold mb-4">Create Test</h3>
        <form onSubmit={handleTestSubmit} className="space-y-3">
          <input
            type="text"
            name="title"
            value={testForm.title}
            onChange={handleTestFormChange}
            placeholder="Test Title"
            className="w-full px-4 py-2 border rounded"
            required
          />
          {testForm.questions.map((q, qIdx) => (
            <div key={qIdx} className="mb-2 border p-3 rounded">
              <input
                type="text"
                name="question"
                value={q.question}
                onChange={e => handleTestFormChange(e, qIdx)}
                placeholder={`Question ${qIdx + 1}`}
                className="w-full px-2 py-1 border rounded mb-2"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt, optIdx) => (
                  <input
                    key={optIdx}
                    type="text"
                    name="option"
                    value={opt}
                    onChange={e => handleTestFormChange(e, qIdx, optIdx)}
                    placeholder={`Option ${optIdx + 1}`}
                    className="px-2 py-1 border rounded"
                    required
                  />
                ))}
              </div>
              <div className="mt-2">
                <label className="text-sm font-medium mr-2">Correct Option:</label>
                <select
                  name="answer"
                  value={q.answer}
                  onChange={e => handleTestFormChange(e, qIdx)}
                  className="border rounded px-2 py-1"
                >
                  {q.options.map((_, idx) => (
                    <option key={idx} value={idx}>Option {idx + 1}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          <div className="flex space-x-2">
            <button type="button" onClick={addQuestion} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
              Add Question
            </button>
            <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
              Create Test
            </button>
          </div>
        </form>

        <h3 className="text-xl font-semibold mt-8 mb-4">Your Tests ({teacherTests.length})</h3>
        {teacherTests.length === 0 ? (
          <p className="text-gray-400">No tests created yet.</p>
        ) : (
          <div className="space-y-2">
            {teacherTests.map(test => (
              <div key={test.id} className="border rounded p-3 flex justify-between items-center">
                <div>
                  <span className="font-semibold">{test.title}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({test.questions.length} questions)
                  </span>
                </div>
                <div className="space-x-2">
                  <button
                    className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                    onClick={() => startAttempt(test.id)}
                  >
                    Preview
                  </button>
                  <button
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    onClick={() => deleteTest(test.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* All Tests (Read-only view) */}
        <h3 className="text-xl font-semibold mt-8 mb-4">All Tests in System ({tests.length})</h3>
        <div className="text-sm text-gray-600 mb-4">
          View all tests created by teachers and admins. You can only edit/delete your own tests.
        </div>
        {tests.length === 0 ? (
          <p className="text-gray-400">No tests in the system yet.</p>
        ) : (
          <div className="space-y-2">
            {tests.map(test => (
              <div key={test.id} className="border rounded p-3 flex justify-between items-center">
                <div>
                  <span className="font-semibold">{test.title}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({test.questions.length} questions)
                  </span>
                  <div className="text-xs text-gray-400">
                    Created by: {test.creatorEmail} ({test.creatorRole})
                    {test.createdBy === user?.uid && (
                      <span className="ml-2 bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        Your Test
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-x-2">
                  <button
                    className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                    onClick={() => startAttempt(test.id)}
                  >
                    Preview
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Attempt Test Modal */}
        {attemptTestId && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h4 className="font-bold mb-2">Test Preview (Time left: {timer}s)</h4>
              {tests.find(t => t.id === attemptTestId).questions.map((q, qIdx) => (
                <div key={qIdx} className="mb-4">
                  <div className="font-semibold mb-2">{qIdx + 1}. {q.question}</div>
                  <div className="space-y-1">
                    {q.options.map((opt, optIdx) => (
                      <label key={optIdx} className="block cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="radio"
                          name={`q${qIdx}`}
                          value={optIdx}
                          checked={attemptAnswers[qIdx] === optIdx}
                          onChange={() => handleAttemptChange(qIdx, optIdx)}
                          className="mr-2"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex space-x-2">
                <button
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  onClick={handleSubmitAttempt}
                >
                  Submit
                </button>
                <button
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                  onClick={() => setAttemptTestId(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Show result */}
        {showResult && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-xl w-full max-w-sm text-center">
              <h4 className="font-bold mb-2">Test Complete!</h4>
              <p className="mb-4">Your Score: {score}/{tests.find(t => t.id === attemptTestId)?.questions.length || 0}</p>
              <button 
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700" 
                onClick={() => setShowResult(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}