import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import logo from './monkeybook-logo.png'; // Ensure the correct import
import { getUsers, createUser, updateUser, deleteUser } from './api/userApi.js';  // Add the .js extension
import Register from './Register.js'; // Add the .js extension

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
        </div>
      )}
      <div className="actions">
        <button onClick={onLike}>Like ({likes})</button>
        <button onClick={onDislike}>Dislike ({dislikes})</button>
        <button onClick={onEdit}>Edit</button>
        <button onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <h1>Welcome to Monkeybook</h1>
      <Register />
    </div>
  );
}

export default App;