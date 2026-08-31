import React, { useEffect, useState } from 'react'
import Posts from '../components/Posts'

const Home = ({
            login,
            user,
            loading,
            createPost,
            openAuthModal
        }) => {
      const [authModalType, setAuthModalType] = useState(null) // 'login' | 'register' | null

    useEffect(() => {
        document.title = 'Firebase Test'
    }, [])

    return (
        <>
            <Posts
                user={user}
                createPost={createPost}
                login={login}
                loading={loading}
                openAuthModal={openAuthModal}
                />
        </>
    )
}

export default Home