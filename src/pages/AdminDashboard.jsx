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

export default function AdminDashboard() {
  const { user } = useAuth();

  // Course state
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({
    title: '',
    details: '',
    price: '',
    file: null,
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

  // Users state
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch users from Firebase
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const users = [];
        querySnapshot.forEach((doc) => {
          users.push({ id: doc.id, ...doc.data() });
        });
        setStudents(users.filter(u => u.role === 'student'));
        setTeachers(users.filter(u => u.role === 'teacher'));
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

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

  // Course handlers
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

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
        uploaderRole: 'admin',
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

  // Delete course
  const deleteCourse = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await deleteDoc(doc(db, 'courses', courseId));
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
        creatorRole: 'admin'
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

  // Attempt test handlers (for preview/demo)
  const startAttempt = (testId) => {
    setAttemptTestId(testId);
    setAttemptAnswers(Array(tests.find(t => t.id === testId).questions.length).fill(null));
    setShowResult(false);
    setScore(0);
    setTimer(30); // 30 seconds for demo
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h2 className="text-3xl font-bold text-blue-800 mb-4">Admin Dashboard</h2>
      <p className="text-gray-700 mb-4">Welcome, {user?.email}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manage Users */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-semibold mb-2">Manage Users</h3>
          <p className="text-sm text-gray-600">Add, remove, or update user roles</p>
          <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add New User</button>
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Students ({students.length})</h4>
            <ul className="mb-4 max-h-32 overflow-y-auto">
              {students.length === 0 && <li className="text-gray-400">No students found.</li>}
              {students.map(s => (
                <li key={s.id} className="text-sm py-1">{s.email || s.fullName}</li>
              ))}
            </ul>
            <h4 className="font-semibold mb-2">Teachers ({teachers.length})</h4>
            <ul className="max-h-32 overflow-y-auto">
              {teachers.length === 0 && <li className="text-gray-400">No teachers found.</li>}
              {teachers.map(t => (
                <li key={t.id} className="text-sm py-1">{t.email || t.fullName}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Upload Course */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-semibold mb-2">Upload New Course</h3>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Course Name"
              className="w-full border px-3 py-2 rounded"
              required
            />
            <textarea
              name="details"
              value={form.details}
              onChange={handleChange}
              placeholder="Course Description"
              className="w-full border px-3 py-2 rounded"
              rows="3"
            />
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              placeholder="Price (0 for free)"
              className="w-full border px-3 py-2 rounded"
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
            <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
              Upload Course
            </button>
          </form>
        </div>
      </div>

      {/* All Courses */}
      <div className="mt-6 bg-white rounded-xl shadow p-6">
        <h4 className="text-lg font-semibold mb-4">All Courses ({courses.length})</h4>
        {courses.length === 0 ? (
          <p className="text-gray-400">No courses uploaded yet.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {courses.map(course => (
              <div key={course.id} className="border rounded p-3 flex justify-between items-start">
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
                <button
                  onClick={() => deleteCourse(course.id)}
                  className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  Delete
                </button>
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
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Create Test
            </button>
          </div>
        </form>

        <h3 className="text-xl font-semibold mt-8 mb-4">All Tests ({tests.length})</h3>
        {tests.length === 0 ? (
          <p className="text-gray-400">No tests created yet.</p>
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
                  </div>
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
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" 
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