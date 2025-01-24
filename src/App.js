import React, { useState } from 'react';
import './App.css';
import logo from './monkeybook-logo.png'; // Import the logo image

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
          <button className="button add-post-button" onClick={() => {
            onSave(editedContent);
            setIsEditing(false);
          }}>Save</button>
        </div>
      ) : (
        <div className="content">{content}</div>
      )}
      <div className="buttons-container">
        <div className="button-with-count">
          <button className="button add-post-button" onClick={onLike}>🍌</button>
          <span className="count">{likes}</span>
        </div>
        <div className="button-with-count">
          <button className="button add-post-button" onClick={onDislike}>💩</button>
          <span className="count">{dislikes}</span>
        </div>
        <button className="button add-post-button delete-button" onClick={onDelete}>🗑️</button> {/* Delete button */}
        <button className="button add-post-button edit-button" onClick={() => {
          setIsEditing(true);
          setEditedContent(content);
        }}>✏️</button> {/* Edit button */}
      </div>
    </div>
  );
}

function App() {
  const [posts, setPosts] = useState([
    { id: 1, content: 'First post', likes: 0, dislikes: 0 },
    { id: 2, content: 'Second post', likes: 0, dislikes: 0 },
  ]);
  const [newPostContent, setNewPostContent] = useState("");
  const [editingId, setEditingId] = useState(null);  // Add this line

  const handleLike = (index) => {
    const newPosts = [...posts];
    newPosts[index].likes += 1;
    setPosts(newPosts);
  };

  const handleDislike = (index) => {
    const newPosts = [...posts];
    newPosts[index].dislikes += 1;
    setPosts(newPosts);
  };

  const handleDelete = (index) => {
    const newPosts = posts.filter((_, i) => i !== index);
    setPosts(newPosts);
  };

  const handleEdit = (index) => {
    setEditingId(posts[index].id);  // Change this line
  };

  const handleSave = (index, newContent) => {
    if (newContent.trim() !== "") {
      const newPosts = [...posts];
      newPosts[index].content = newContent;
      setPosts(newPosts);
      setEditingId(null);  // Add this line
    }
  };

  const handlePost = () => {
    if (newPostContent.trim() !== "") {
      const newPost = {
        id: Date.now(), // Simple way to generate unique IDs
        content: newPostContent,
        likes: 0,
        dislikes: 0
      };
      setPosts([newPost, ...posts]);
      setNewPostContent("");
    }
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
              onSave={(newContent) => handleSave(index, newContent)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
