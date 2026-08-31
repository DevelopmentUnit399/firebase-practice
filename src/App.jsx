import { auth, db } from './firebase/init'
import { collection, addDoc } from "firebase/firestore"
import './App.css'
import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { 
          createUserWithEmailAndPassword,
          signInWithEmailAndPassword,
          signOut,
          onAuthStateChanged,
          GoogleAuthProvider,
          FacebookAuthProvider,
          signInWithPopup
        } from "firebase/auth"
import Nav from './components/Nav'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import Account from './pages/Account'

function App() {
  const [user, setUser] = React.useState({})
  const [loading, setLoading] = React.useState(true)
  const [authModalType, setAuthModalType] = useState(null) // 'login' | 'register' | null

  function loginWithGoogle() {
    const provider = new GoogleAuthProvider()
    return signInWithPopup(auth, provider)
  }

  function loginWithFacebook() {
    const provider = new FacebookAuthProvider()
    return signInWithPopup(auth, provider)
  }

  const openAuthModal = (type) => {
    setAuthModalType(type)
  }

  const closeAuthModal = () => {
    setAuthModalType(null)
  }

  function createPost(title, description) {
    if (!user?.uid) {
      alert("Please log in first.")
      return
    }

    const post = {
      title: title,
      description: description,
      uid: user.uid,
      createdAt: new Date().toISOString()
    }

    addDoc(collection(db, "posts"), post)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  function logout() {
    signOut(auth)
  }

  function register(email, password) {
    return createUserWithEmailAndPassword(auth, email, password)
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
  }

  return (
    <Router>
      <ScrollToTop />
        <div className="App">
          <Nav login={login}
                logout={logout}
                register={register}
                user={user}
                loading={loading}
                authModalType={authModalType}
                openAuthModal={openAuthModal}
                closeAuthModal={closeAuthModal}
                loginWithGoogle={loginWithGoogle}
                loginWithFacebook={loginWithFacebook}
                />
          <Routes>
            <Route path="/" exact element={
              <Home
                loading={loading}
                register={register}
                login={login}
                logout={logout}
                user={user}
                createPost={createPost}
                openAuthModal={openAuthModal}
                />} />
              <Route path="/account" element={<Account user={user} loading={loading} />} />
          </Routes>
        </div>
    </Router>
  );
}

export default App;
