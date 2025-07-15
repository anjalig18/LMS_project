import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';

export default function ResourceManagement() {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [resourceData, setResourceData] = useState({
    title: '',
    description: '',
    type: 'pdf', // pdf, video, link
    videoUrl: '',
    linkUrl: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const resourcesSnapshot = await getDocs(collection(db, 'resources'));
      setResources(resourcesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return null;
    const storageRef = ref(storage, `resources/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  };

  const handleSubmitResource = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let fileUrl = '';

      // Handle file upload for PDF/video files
      if (resourceData.type === 'pdf' || resourceData.type === 'video') {
        if (selectedFile) {
          fileUrl = await handleFileUpload(selectedFile);
        }
      }

      // Prepare resource data
      const resourceToSave = {
        title: resourceData.title,
        description: resourceData.description,
        type: resourceData.type,
        createdBy: user.email,
        createdAt: new Date().toISOString()
      };

      // Add URL based on type
      if (resourceData.type === 'pdf' || resourceData.type === 'video') {
        resourceToSave.fileUrl = fileUrl;
      } else if (resourceData.type === 'video_link') {
        resourceToSave.videoUrl = resourceData.videoUrl;
      } else if (resourceData.type === 'link') {
        resourceToSave.linkUrl = resourceData.linkUrl;
      }

      await addDoc(collection(db, 'resources'), resourceToSave);

      alert('Resource uploaded successfully!');
      setResourceData({
        title: '',
        description: '',
        type: 'pdf',
        videoUrl: '',
        linkUrl: ''
      });
      setSelectedFile(null);
      setShowCreateForm(false);
      fetchResources();
    } catch (error) {
      console.error('Error uploading resource:', error);
      alert('Error uploading resource. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      try {
        await deleteDoc(doc(db, 'resources', resourceId));
        alert('Resource deleted successfully!');
        fetchResources();
      } catch (error) {
        console.error('Error deleting resource:', error);
        alert('Error deleting resource. Please try again.');
      }
    }
  };

  const getResourceIcon = (type) => {
    switch (type) {
      case 'pdf':
        return '📄';
      case 'video':
        return '🎥';
      case 'video_link':
        return '🔗';
      case 'link':
        return '🌐';
      default:
        return '📁';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-800">Resource Management</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          {showCreateForm ? 'Cancel' : 'Upload Resource'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h4 className="text-lg font-semibold mb-4">Upload New Resource</h4>
          <form onSubmit={handleSubmitResource} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resource Title</label>
              <input
                type="text"
                value={resourceData.title}
                onChange={(e) => setResourceData({ ...resourceData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={resourceData.description}
                onChange={(e) => setResourceData({ ...resourceData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
              <select
                value={resourceData.type}
                onChange={(e) => setResourceData({ ...resourceData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="pdf">PDF File</option>
                <option value="video">Video File</option>
                <option value="video_link">Video Link (YouTube, etc.)</option>
                <option value="link">External Link</option>
              </select>
            </div>

            {(resourceData.type === 'pdf' || resourceData.type === 'video') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
                <input
                  type="file"
                  accept={resourceData.type === 'pdf' ? '.pdf' : 'video/*'}
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            )}

            {resourceData.type === 'video_link' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
                <input
                  type="url"
                  value={resourceData.videoUrl}
                  onChange={(e) => setResourceData({ ...resourceData, videoUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://youtube.com/..."
                  required
                />
              </div>
            )}

            {resourceData.type === 'link' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">External Link URL</label>
                <input
                  type="url"
                  value={resourceData.linkUrl}
                  onChange={(e) => setResourceData({ ...resourceData, linkUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://example.com/..."
                  required
                />
              </div>
            )}

            <button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              disabled={loading}
            >
              {loading ? 'Uploading...' : 'Submit'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        <h4 className="text-lg font-semibold mb-4">All Resources</h4>
        <ul className="divide-y divide-gray-200">
          {resources.length === 0 && (
            <li className="py-4 text-gray-500">No resources found.</li>
          )}
          {resources.map((resource) => (
            <li key={resource.id} className="py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getResourceIcon(resource.type)}</span>
                <div>
                  <div className="font-medium text-gray-900">{resource.title}</div>
                  <div className="text-sm text-gray-500">{resource.description}</div>
                  <div className="text-xs text-gray-400">
                    Uploaded by {resource.createdBy} on {new Date(resource.createdAt).toLocaleString()}
                  </div>
                  {resource.fileUrl && (
                    <a
                      href={resource.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 underline text-sm"
                    >
                      Download/View
                    </a>
                  )}
                  {resource.videoUrl && (
                    <a
                      href={resource.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 underline text-sm"
                    >
                      Watch Video
                    </a>
                  )}
                  {resource.linkUrl && (
                    <a
                      href={resource.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 underline text-sm"
                    >
                      Visit Link
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDeleteResource(resource.id)}
                className="ml-4 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}