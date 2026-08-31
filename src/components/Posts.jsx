import React, { useState, useEffect } from 'react'
import { db } from '../firebase/init'
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore'

const Posts = ({ user, createPost, openAuthModal, loading }) => {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [posts, setPosts] = useState([])

  // Modal edit state
  const [editingPost, setEditingPost] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  // Modal delete state
  const [deletingPost, setDeletingPost] = useState(null)

  useEffect(() => {
    if (!user?.uid) {
      setPosts([])
      return
    }

    const postsQuery = query(
      collection(db, "posts"),
      where("uid", "==", user.uid)
    )

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const fetchedPosts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      setPosts(fetchedPosts)
    })

    return () => unsubscribe()
  }, [user?.uid])

  const openCreateModal = () => {
    if (!user?.uid) {
      alert("Please login to create a post.")
      return
    }
    setCreateModalOpen(true)
  }

  const closeCreateModal = () => {
    setCreateModalOpen(false)
    setTitle('')
    setDescription('')
  }

  const handleCreateSubmit = () => {
    if (!title.trim() || !description.trim()) {
      alert("Please fill in both title and description.")
      return
    }

    createPost(title, description)
    closeCreateModal()
  }

  const openEditModal = (post) => {
    setEditingPost(post)
    setEditTitle(post.title)
    setEditDescription(post.description)
  }

  const closeEditModal = () => {
    setEditingPost(null)
    setEditTitle('')
    setEditDescription('')
  }

  const handleUpdate = async () => {
    if (!editTitle.trim() || !editDescription.trim()) {
      alert("Please fill in both title and description.")
      return
    }

    const postRef = doc(db, "posts", editingPost.id)
    await updateDoc(postRef, {
      title: editTitle,
      description: editDescription
    })

    closeEditModal()
  }

  const openDeleteModal = (post) => {
    setDeletingPost(post)
  }

  const closeDeleteModal = () => {
    setDeletingPost(null)
  }

  const confirmDelete = async () => {
    if (!deletingPost?.id) return

    const postRef = doc(db, "posts", deletingPost.id)
    await deleteDoc(postRef)

    closeDeleteModal()
  }

  return (
    <section id="posts">
      <div className="row">
        <div className="posts__handler">
          {loading ? (
            <div className="skeleton skeleton__btn"></div>
          ) : user?.uid ? (
            <button className="post__create--toggle btn" onClick={openCreateModal}>
              Create New Post
            </button>
          ) : null}

          <div className="existing__posts">
            <div className="post">
              {loading ? (
                <div className="skeleton skeleton__title"></div>
              ) : (
                <h2 className="posts__title">Posts</h2>
              )}

              {loading ? (
                new Array(3).fill(0).map((_, index) => (
                  <div className="skeleton__post" key={index}>
                    <div className="skeleton skeleton__post--title"></div>
                    <div className="skeleton skeleton__post--desc"></div>
                    <div className="skeleton skeleton__post--btn"></div>
                    <div className="skeleton skeleton__post--btn"></div>
                  </div>
                ))
              ) : !user?.uid ? (
                <div className="post__content">
                  <h3 className="post__desc">
                    Please <button className="btn" onClick={() => openAuthModal('login')}>Login</button> in order to see your posts.
                  </h3>
                </div>
              ) : posts.length === 0 ? (
                <div className="post__content">
                  <h3 className="post__desc">No posts found for your account!</h3>
                </div>
              ) : (
                posts.map((item) => (
                  <div className="post__content" key={item.id}>
                    <h3 className="post__title">{item.title}</h3>
                    <p className="post__desc">{item.description}</p>
                    <button className="post__edit btn" onClick={() => openEditModal(item)}>
                      Edit Post
                    </button>
                    <button className="post__delete btn" onClick={() => openDeleteModal(item)}>
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE POST MODAL */}
      {createModalOpen && (
        <div className="modal__backdrop" onClick={closeCreateModal}>
          <div className="modal__box" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Post</h2>
            <p className="input__title--text">Title</p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title..."
            />
            <p className="input__title--description">Description</p>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter post description..."
            />
            <div className="modal__actions">
              <button className="btn__cancel" onClick={closeCreateModal}>
                Cancel
              </button>
              <button className="btn" onClick={handleCreateSubmit}>
                Create Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingPost && (
        <div className="modal__backdrop" onClick={closeEditModal}>
          <div className="modal__box" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Post</h2>
            <p className="input__title--text">Title</p>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <p className="input__title--description">Description</p>
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
            <div className="modal__actions">
              <button className="btn__cancel" onClick={closeEditModal}>
                Cancel
              </button>
              <button className="btn" onClick={handleUpdate}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingPost && (
        <div className="modal__backdrop" onClick={closeDeleteModal}>
          <div className="modal__box" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Post</h2>
            <p style={{ textAlign: 'center', margin: '16px 0', fontSize: '18px' }}>
              Are you sure you want to delete <strong>"{deletingPost.title}"</strong>? This action cannot be undone.[cite: 17]
            </p>
            <div className="modal__actions">
              <button className="btn__cancel" onClick={closeDeleteModal}>
                Cancel
              </button>
              <button
                className="btn"
                style={{ backgroundColor: '#e74c3c' }}
                onClick={confirmDelete}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Posts