import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';

export default function TestManagement() {
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    questions: [{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const testsSnapshot = await getDocs(collection(db, 'tests'));
      setTests(testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching tests:', error);
    }
  };

  const handleAddQuestion = () => {
    setTestData({
      ...testData,
      questions: [...testData.questions, { question: '', options: ['', '', '', ''], correctAnswer: 0 }]
    });
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = testData.questions.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    );
    setTestData({ ...testData, questions: updatedQuestions });
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const updatedQuestions = testData.questions.map((q, i) => 
      i === questionIndex ? {
        ...q,
        options: q.options.map((opt, j) => j === optionIndex ? value : opt)
      } : q
    );
    setTestData({ ...testData, questions: updatedQuestions });
  };

  const handleSubmitTest = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await addDoc(collection(db, 'tests'), {
        ...testData,
        createdBy: user.email,
        createdAt: new Date().toISOString()
      });
      
      alert('Test created successfully!');
      setTestData({
        title: '',
        description: '',
        questions: [{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]
      });
      setShowCreateForm(false);
      fetchTests();
    } catch (error) {
      console.error('Error creating test:', error);
      alert('Error creating test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (window.confirm('Are you sure you want to delete this test?')) {
      try {
        await deleteDoc(doc(db, 'tests', testId));
        alert('Test deleted successfully!');
        fetchTests();
      } catch (error) {
        console.error('Error deleting test:', error);
        alert('Error deleting test. Please try again.');
      }
    }
  };

  const removeQuestion = (index) => {
    const updatedQuestions = testData.questions.filter((_, i) => i !== index);
    setTestData({ ...testData, questions: updatedQuestions });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-800">Test Management</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showCreateForm ? 'Cancel' : 'Create New Test'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h4 className="text-lg font-semibold mb-4">Create New Test</h4>
          <form onSubmit={handleSubmitTest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Title</label>
              <input
                type="text"
                value={testData.title}
                onChange={(e) => setTestData({ ...testData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={testData.description}
                onChange={(e) => setTestData({ ...testData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700">Questions</label>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Add Question
                </button>
              </div>

              {testData.questions.map((question, questionIndex) => (
                <div key={questionIndex} className="border p-4 rounded-md mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-medium">Question {questionIndex + 1}</h5>
                    {testData.questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(questionIndex)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Enter question"
                    value={question.question}
                    onChange={(e) => handleQuestionChange(questionIndex, 'question', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />

                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name={`correct-${questionIndex}`}
                          checked={question.correctAnswer === optionIndex}
                          onChange={() => handleQuestionChange(questionIndex, 'correctAnswer', optionIndex)}
                          className="text-blue-600"
                        />
                        <input
                          type="text"
                          placeholder={`Option ${optionIndex + 1}`}
                          value={option}
                          onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating Test...' : 'Create Test'}
            </button>
          </form>
        </div>
      )}

      {/* Existing Tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tests.map(test => (
          <div key={test.id} className="bg-white rounded-xl shadow-md p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">{test.title}</h4>
            <p className="text-gray-600 mb-4">{test.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Questions: {test.questions.length} | Created by: {test.createdBy}
              </span>
              <button
                onClick={() => handleDeleteTest(test.id)}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}