import React, { useState, useEffect } from 'react';
import './App.css';
import logo from './monkeybook-logo.png'; // Ensure the correct import
import config from './config.js';  // Ensure the correct import
import { getUsers, createUser, updateUser, deleteUser } from './api/userApi.js';  // Add the .js extension

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
        const data = await response.json();
        setDbStatus(data.status);
      } catch (err) {
        setDbStatus('disconnected');
        console.error('Failed to check database connection:', err);
      }
    };

    checkConnection();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const users = await getUsers();
      console.log('Fetched users:', users); // Debugging
      setUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

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

  const handleDeleteUser = async (id) => {
    try {
      await deleteUser(id);
      console.log('Deleted user:', id); // Debugging
      setUsers(users.filter((u) => u._id !== id));
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleCreatePost = () => {
    console.log('Creating post with content:', newPostContent); // Debugging
    const newPost = {
      content: newPostContent,
      likes: 0,
      dislikes: 0,
    };
    setPosts([...posts, newPost]);
    setNewPostContent(''); // Clear the input after creating the post
  };

  const handleLike = (index) => {
    const updatedPosts = [...posts];
    updatedPosts[index].likes += 1;
    setPosts(updatedPosts);
  };

  const handleDislike = (index) => {
    const updatedPosts = [...posts];
    updatedPosts[index].dislikes += 1;
    setPosts(updatedPosts);
  };

  const handleDelete = (index) => {
    const updatedPosts = posts.filter((_, i) => i !== index);
    setPosts(updatedPosts);
  };

  const handleEdit = (index) => {
    // Logic to handle edit
  };

  const handleSave = (index, newContent) => {
    const updatedPosts = [...posts];
    updatedPosts[index].content = newContent;
    setPosts(updatedPosts);
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
      </header>
      
      <div className="content-container">
        <div className="post-field">
          <input
            type="text"
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Write a new post..."
          />
          <button className="post-button" onClick={handlePost}>Post</button>
        </div>
        <div id="posts-container">
          {posts.map((post, index) => (
            <Post
              key={index}
              content={post.content}
              likes={post.likes}
              dislikes={post.dislikes}
              onLike={() => handleLike(index)}
              onDislike={() => handleDislike(index)}
              onDelete={() => handleDelete(index)}
              onEdit={() => handleEdit(index)}
              onSave={() => handleSave(index)}
            />
          ))}
        </div>
      </div>
      <div>
        <img src={logo} alt="Monkeybook Logo" /> {/* Add the logo image */}
      </div>
      <div>
        <input
          type="text"
          placeholder="Name"
          value={newUser.name}
          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
        />
        <input
          type="email"
          placeholder="Email"
          value={newUser.email}
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          value={newUser.password}
          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
        />
        <button onClick={handleCreateUser}>Create User</button>
      </div>
      <div>
        <input
          type="text"
          placeholder="New Post Content"
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
        />
        <button onClick={handleCreatePost}>Create Post</button>
      </div>
      <div id="posts-container">
        {posts.map((post, index) => (
          <Post
            key={index}
            content={post.content}
            likes={post.likes}
            dislikes={post.dislikes}
            onLike={() => handleLike(index)}
            onDislike={() => handleDislike(index)}
            onDelete={() => handleDelete(index)}
            onEdit={() => handleEdit(index)}
            onSave={(newContent) => handleSave(index, newContent)}
          />
        ))}
      </div>
      <ul>
        {users.map((user) => (
          <li key={user._id}>
            {user.name} - {user.email}
            <button onClick={() => handleUpdateUser(user._id, { ...user, name: 'Updated Name' })}>
              Update
            </button>
            <button onClick={() => handleDeleteUser(user._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;