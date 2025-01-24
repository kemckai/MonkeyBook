import React, { useState } from 'react';

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

function Posts() {
  const [newPostContent, setNewPostContent] = useState(''); // Define newPostContent state
  const [posts, setPosts] = useState([]); // Define posts state

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
    <div>
      <h1>Posts</h1>
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
    </div>
  );
}

export default Posts;