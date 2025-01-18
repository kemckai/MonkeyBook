import React, { useState } from 'react';
import './App.css';
import logo from './monkeybook-logo.png'; // Import the logo image

function Post({ content, likes, dislikes, onLike, onDislike, onDelete, onEdit, onSave }) {
  return (
    <div className="post">
      <div className="content">{content}</div>
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
        <button className="button add-post-button edit-button" onClick={onEdit}>✏️</button> {/* Edit button */}
        <button className="button add-post-button save-button" onClick={onSave}>Save</button> {/* Save button */}
      </div>
    </div>
  );
}

function App() {
  const [posts, setPosts] = useState([
    { content: 'First post', likes: 0, dislikes: 0 },
    { content: 'Second post', likes: 0, dislikes: 0 },
  ]);
  const [newPostContent, setNewPostContent] = useState("");

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
    const newContent = prompt("Edit your post:", posts[index].content);
    if (newContent !== null) {
      const newPosts = [...posts];
      newPosts[index].content = newContent;
      setPosts(newPosts);
    }
  };

  const handleSave = (index) => {
    // Implement save functionality
  };

  const handlePost = () => {
    if (newPostContent.trim() !== "") {
      const newPosts = [{ content: newPostContent, likes: 0, dislikes: 0 }, ...posts];
      setPosts(newPosts);
      setNewPostContent("");
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
      </header>
      <textarea className="fixed-textarea" placeholder="Type your text here..."></textarea>
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
    </div>
  );
}

export default App;
