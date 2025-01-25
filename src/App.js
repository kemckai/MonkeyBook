import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import logo from './monkeybook-logo.png'; // Ensure the correct import
import { getUsers, createUser, updateUser, deleteUser } from './api/userApi.js';

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
  const [newPostContent, setNewPostContent] = useState('');
  const [posts, setPosts] = useState([]);
  const elementRef = useRef(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await getUsers();
        setUsers(users);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    try {
      const createdUser = await createUser(newUser);
      console.log('Created user:', createdUser);
      setUsers([...users, createdUser]);
      setNewUser({ name: '', email: '', password: '' });
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleUpdateUser = async (id, updatedUser) => {
    try {
      const user = await updateUser(id, updatedUser);
      console.log('Updated user:', user);
      setUsers(users.map((u) => (u._id === id ? user : u)));
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await deleteUser(id);
      setUsers(users.filter((u) => u._id !== id));
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handlePost = (content) => {
    setPosts([...posts, { content, likes: 0, dislikes: 0 }]);
  };

  useEffect(() => {
    if (elementRef.current) {
      elementRef.current.src = 'about:blank';
      const isVisible = elementRef.current.getBoundingClientRect().width > 0 && elementRef.current.getBoundingClientRect().height > 0;
      const data = {
        isVisible: isVisible
      };
      console.log(data);
    }
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" ref={elementRef} />
        
        <input
          type="text"
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
        />
        <button onClick={() => handlePost(newPostContent)}>Post</button>
        <button onClick={handleCreateUser}>Create User</button>
        {users.map((user) => (
          <div key={user._id}>
            <span>{user.name}</span>
            <button onClick={() => handleUpdateUser(user._id, { name: 'Updated Name' })}>Update User</button>
            <button onClick={() => handleDeleteUser(user._id)}>Delete User</button>
          </div>
        ))}
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
  );
}

export default App;

