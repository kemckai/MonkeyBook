import React, { useState } from 'react';
import './App.css';
import logo from './monkeybook-logo.png'; // Import the logo image

function Post({ content, likes, dislikes, onLike, onDislike, onDelete }) {
  return (
    <div className="post">
      <div className="content">{content}</div>
      <div className="buttons-container">
        <button className="button" onClick={onLike}>🍌</button> {/* Single banana emoji */}
        <button className="button" onClick={onDislike}>💩</button>
        <button className="button delete-button" onClick={onDelete}>🗑️</button> {/* Delete button */}
      </div>
      <div className="reaction-counts">
        <span className="likes-count">{likes}</span> + 
        <span className="dislikes-count">{dislikes}</span>
      </div>
    </div>
  );
}

function App() {
  const [posts, setPosts] = useState([
    { content: "This is the first monkey post!", likes: 0, dislikes: 0 },
    { content: "This is the second monkey post!", likes: 0, dislikes: 0 },
    { content: "This is the third monkey post!", likes: 0, dislikes: 0 }
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

  const handlePost = () => {
    if (newPostContent.trim() !== "") {
      const newPosts = [{ content: newPostContent, likes: 0, dislikes: 0 }, ...posts];
      setPosts(newPosts);
      setNewPostContent("");
    }
  };

  return (
    <div className="App">
      <img src={logo} alt="MonkeyBook Logo" className="logo" /> {/* Add the logo */}
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
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
