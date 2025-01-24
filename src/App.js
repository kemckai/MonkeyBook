import React, { useState, useEffect } from 'react';
import './App.css';
import logo from './monkeybook-logo.png'; // Ensure the correct import
import { getUsers, createUser, updateUser, deleteUser } from './api/userApi.js';  // Ensure the correct import
import ErrorBoundary from './ErrorBoundary.js'; // Ensure the correct import

function Post({ content, likes, dislikes, onLike, onDislike, onDelete, onEdit, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  return (
    <div className="post">
      {isEditing ? (
        <div className="content">
          <input
            type="text"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
          />
          <button onClick={() => { onSave(editedContent); setIsEditing(false); }}>Save</button>
        </div>
      ) : (
        <div className="content">
          {content}
          <button onClick={() => setIsEditing(true)}>Edit</button>
        </div>
      )}
      <div className="buttons-container">
        <button onClick={onLike}>Like {likes}</button>
        <button onClick={onDislike}>Dislike {dislikes}</button>
        <button onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

function App() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });
  const [newPostContent, setNewPostContent] = useState(''); // Define newPostContent state
  const [posts, setPosts] = useState([]); // Define posts state
  const [dbStatus, setDbStatus] = useState('connecting'); // Define dbStatus state

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/check-connection');
        const status = await response.json();
        setDbStatus(status);
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    };

    checkConnection();
  }, []);

  const handleCreateUser = async () => {
    try {
      const createdUser = await createUser(newUser);
      console.log('Created user:', createdUser); // Debugging
      setUsers([...users, createdUser]);
      setNewUser({ name: '', email: '', password: '' });
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleUpdateUser = async (id, updatedUser) => {
    try {
      const user = await updateUser(id, updatedUser);
      console.log('Updated user:', user); // Debugging
      setUsers(users.map((u) => (u._id === id ? user : u)));
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handlePost = (content) => {
    setPosts([...posts, { content, likes: 0, dislikes: 0 }]);
  };

  return (
    <ErrorBoundary>
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <textarea
            className="fixed-textarea"
            placeholder="Type your text here..."
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
          />
          <button onClick={() => handlePost(newPostContent)}>Post</button>
          {posts.map((post, index) => (
            <Post
              key={index}
              content={post.content}
              likes={post.likes}
              dislikes={post.dislikes}
              onLike={() => {
                const newPosts = [...posts];
                newPosts[index].likes += 1;
                setPosts(newPosts);
              }}
              onDislike={() => {
                const newPosts = [...posts];
                newPosts[index].dislikes += 1;
                setPosts(newPosts);
              }}
              onDelete={() => {
                const newPosts = posts.filter((_, i) => i !== index);
                setPosts(newPosts);
              }}
              onEdit={(newContent) => {
                const newPosts = [...posts];
                newPosts[index].content = newContent;
                setPosts(newPosts);
              }}
              onSave={(newContent) => {
                const newPosts = [...posts];
                newPosts[index].content = newContent;
                setPosts(newPosts);
              }}
            />
          ))}
        </header>
      </div>
    </ErrorBoundary>
  );
}

export default App;