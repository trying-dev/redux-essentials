import React, { useState } from 'react'

import { useDispatch, useSelector } from 'react-redux'

import { unwrapResult } from '@reduxjs/toolkit'

import { addNewPost } from './postsSlice'

import { selectAllUsers } from '../users/usersSlice'


// 

const usersOptions = (users) => users.map((user) => (
  <option key={user.id} value={user.id}>
    {user.name}
  </option>
))


//

export const AddPostForm = () => {
  const dispatch = useDispatch()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [userId, setUserId] = useState('')

  const [addRequestStatus, setAddRequestStatus] = useState('idle')
  
  const users = useSelector(selectAllUsers)

  const onTitleChanged = (e) => setTitle(e.target.value)
  const onContentChanged = (e) => setContent(e.target.value)
  const onAuthorChanged = (e) => setUserId(e.target.value)

  const canSave = [title, content, userId].every(Boolean) && addRequestStatus === 'idle'


  const resetFields = ( ) => {
    setTitle('')
    setContent('')
    setUserId('')
  }

  const onSavePostClicked = async () => {
    if (canSave) {
      try {
        setAddRequestStatus('pending')

        const resultAction = dispatch(
          addNewPost({ title, content, user: userId })
        )

        unwrapResult(resultAction)

        resetFields()

      } catch (err) {

        console.error('Failed to save the post: ', err)

      } finally {

        setAddRequestStatus('idle')

      }
    }
  }

  

  return (
    <section className='add-a-new-post'>

      <h2>Add a New Post</h2>

      <form>

        <label htmlFor="postTitle">
          Post Title:
          <input
            type="text"
            id="postTitle"
            name="postTitle"
            placeholder="What's on your mind?"
            value={title}
            onChange={onTitleChanged}
          />
        </label>

        <label htmlFor="postAuthor">
          Author:
          <select id="postAuthor" value={userId} onChange={onAuthorChanged}>
            <option value=""></option>
            {usersOptions(users)}
          </select>
        </label>

        <label htmlFor="postContent">
          Content:
          <textarea
            id="postContent"
            name="postContent"
            value={content}
            onChange={onContentChanged}
          />
        </label>

        <button type="button" onClick={onSavePostClicked} disabled={!canSave}>
          Save Post
        </button>
        
      </form>
    </section>
  )
}
