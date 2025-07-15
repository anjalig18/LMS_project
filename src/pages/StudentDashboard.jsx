import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function StudentDashboard() {
  const { user } = useAuth();
  
  // State management
  const [courses, setCourses] = useState([]);
  const [tests, setTests] = useState([]);
  const [purchased, setPurchased] = useState([]);
  const [attemptTestId, setAttemptTestId] = useState(null);
  const [attemptAnswers, setAttemptAnswers] = useState([]);
  const [timer, setTimer] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  // Fetch user profile and purchased courses
  useEffect(() => {
    if (!user) return;

    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserProfile(userData);
          setPurchased(userData.purchasedCourses || []);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [user]);

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

  // Purchase handler
  const handlePurchase = async (courseId) => {
    if (!user) return;

    try {
      const newPurchased = [...purchased, courseId];
      setPurchased(newPurchased);

      // Update user's purchased courses in Firebase
      await updateDoc(doc(db, 'users', user.uid), {
        purchasedCourses: newPurchased
      });

      // Log the purchase
      await addDoc(collection(db, 'purchases'), {
        userId: user.uid,
        userEmail: user.email,
        courseId: courseId,
        courseTitle: courses.find(c => c.id === courseId)?.title,
        purchaseDate: serverTimestamp(),
        amount: courses.find(c => c.id === courseId)?.price || 0
      });

      alert('Course purchased successfully!');
    } catch (error) {
      console.error('Error purchasing course:', error);
      alert('Error purchasing course. Please try again.');
    }
  };

  // Get free course handler
  const handleGetFree = async (courseId) => {
    if (!user) return;

    try {
      const newPurchased = [...purchased, courseId];
      setPurchased(newPurchased);

      // Update user's purchased courses in Firebase
      await updateDoc(doc(db, 'users', user.uid), {
        purchasedCourses: newPurchased
      });

      // Log the free course access
      await addDoc(collection(db, 'purchases'), {
        userId: user.uid,
        userEmail: user.email,
        courseId: courseId,
        courseTitle: courses.find(c => c.id === courseId)?.title,
        purchaseDate: serverTimestamp(),
        amount: 0,
        type: 'free'
      });

      alert('Free course added to your library!');
    } catch (error) {
      console.error('Error getting free course:', error);
      alert('Error getting free course. Please try again.');
    }
  };

  // Test attempt handlers
  const startAttempt = (testId) => {
    setAttemptTestId(testId);
    setAttemptAnswers(Array(tests.find(t => t.id === testId).questions.length).fill(null));
    setShowResult(false);
    setScore(0);
    setTimer(60); // 60 seconds per test
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

  const handleSubmitAttempt = async () => {
    const test = tests.find(t => t.id === attemptTestId);
    let correct = 0;
    test.questions.forEach((q, idx) => {
      if (attemptAnswers[idx] === q.answer) correct++;
    });
    setScore(correct);
    setShowResult(true);

    // Save test result to Firebase
    try {
      await addDoc(collection(db, 'testResults'), {
        userId: user.uid,
        userEmail: user.email,
        testId: attemptTestId,
        testTitle: test.title,
        score: correct,
        totalQuestions: test.questions.length,
        answers: attemptAnswers,
        completedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving test result:', error);
    }

    setAttemptTestId(null);
    setTimer(0);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const downloadCourse = (course) => {
    // In a real app, this would handle file download from Firebase Storage
    if (course.fileUrl && course.fileUrl !== '#') {
      window.open(course.fileUrl, '_blank');
    } else {
      alert('Course file not available. Please contact support.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading courses...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h2 className="text-3xl font-bold text-green-800 mb-2">Student Dashboard</h2>
      <p className="text-gray-600 mb-6">Welcome back, {user?.email}!</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Your Courses */}
        <div className="bg-white p-6 shadow rounded-xl">
          <h3 className="text-xl font-semibold mb-4">Your Courses ({purchased.length})</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {purchased.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                <p>No courses purchased yet.</p>
                <p className="text-sm">Browse available courses to get started!</p>
              </div>
            ) : (
              courses.filter(c => purchased.includes(c.id)).map(course => (
                <div key={course.id} className="border rounded-lg p-4">
                  <h4 className="font-semibold text-lg mb-2">{course.title}</h4>
                  <p className="text-sm text-gray-600 mb-2">{course.details}</p>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      <span>Uploaded: {formatDate(course.uploadDate)}</span>
                      <span className="ml-2">By: {course.uploaderEmail}</span>
                    </div>
                                        <button
                                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                          onClick={() => downloadCourse(course)}
                                        >
                                          Download
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                            {/* Available Courses */}
                            <div className="bg-white p-6 shadow rounded-xl">
                              <h3 className="text-xl font-semibold mb-4">Available Courses</h3>
                              <div className="space-y-4 max-h-96 overflow-y-auto">
                                {courses.filter(c => !purchased.includes(c.id)).length === 0 ? (
                                  <div className="text-gray-400 text-center py-8">
                                    <p>All available courses have been added to your library.</p>
                                  </div>
                                ) : (
                                  courses.filter(c => !purchased.includes(c.id)).map(course => (
                                    <div key={course.id} className="border rounded-lg p-4">
                                      <h4 className="font-semibold text-lg mb-2">{course.title}</h4>
                                      <p className="text-sm text-gray-600 mb-2">{course.details}</p>
                                      <div className="flex items-center justify-between">
                                        <div className="text-xs text-gray-500">
                                          <span>Uploaded: {formatDate(course.uploadDate)}</span>
                                          <span className="ml-2">By: {course.uploaderEmail}</span>
                                        </div>
                                        {course.price > 0 ? (
                                          <button
                                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                            onClick={() => handlePurchase(course.id)}
                                          >
                                            Buy ₹{course.price}
                                          </button>
                                        ) : (
                                          <button
                                            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                                            onClick={() => handleGetFree(course.id)}
                                          >
                                            Get Free
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                    
                          {/* Tests Section */}
                          <div className="bg-white p-6 shadow rounded-xl mt-8">
                            <h3 className="text-xl font-semibold mb-4">Tests</h3>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                              {tests.length === 0 ? (
                                <div className="text-gray-400 text-center py-8">
                                  <p>No tests available at the moment.</p>
                                </div>
                              ) : (
                                tests.map(test => (
                                  <div key={test.id} className="border rounded-lg p-4">
                                    <h4 className="font-semibold text-lg mb-2">{test.title}</h4>
                                    <p className="text-sm text-gray-600 mb-2">{test.description}</p>
                                    <div className="flex items-center justify-between">
                                      <div className="text-xs text-gray-500">
                                        <span>Questions: {test.questions.length}</span>
                                      </div>
                                      <button
                                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                                        onClick={() => startAttempt(test.id)}
                                        disabled={attemptTestId !== null}
                                      >
                                        Attempt
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                    
                          {/* Test Attempt Modal */}
                          {attemptTestId && (
                            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                              <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-lg">
                                <h3 className="text-xl font-semibold mb-4">
                                  Attempt Test: {tests.find(t => t.id === attemptTestId)?.title}
                                </h3>
                                <div className="mb-4 text-right text-sm text-gray-600">
                                  Time left: {timer}s
                                </div>
                                <form
                                  onSubmit={e => {
                                    e.preventDefault();
                                    handleSubmitAttempt();
                                  }}
                                >
                                  {tests
                                    .find(t => t.id === attemptTestId)
                                    ?.questions.map((q, idx) => (
                                      <div key={idx} className="mb-4">
                                        <div className="font-medium mb-2">
                                          Q{idx + 1}: {q.question}
                                        </div>
                                        <div className="space-y-1">
                                          {q.options.map((opt, oIdx) => (
                                            <label key={oIdx} className="block">
                                              <input
                                                type="radio"
                                                name={`q${idx}`}
                                                value={oIdx}
                                                checked={attemptAnswers[idx] === oIdx}
                                                onChange={() => handleAttemptChange(idx, oIdx)}
                                                className="mr-2"
                                                required
                                              />
                                              {opt}
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  <div className="flex justify-end space-x-2 mt-6">
                                    <button
                                      type="button"
                                      className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                                      onClick={() => {
                                        setAttemptTestId(null);
                                        setTimer(0);
                                      }}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                    >
                                      Submit
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </div>
                          )}
                    
                          {/* Test Result Modal */}
                          {showResult && (
                            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                              <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                                <h3 className="text-xl font-semibold mb-4">Test Result</h3>
                                <div className="mb-4">
                                  <span className="font-bold">Score:</span> {score} /{' '}
                                  {tests.find(t => t.id === attemptTestId)?.questions.length || tests.find(t => t.id === attemptTestId)?.questions.length || 0}
                                </div>
                                <button
                                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                  onClick={() => setShowResult(false)}
                                >
                                  Close
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }