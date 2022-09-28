import {
  createAction,
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
  createSelector,
  isAnyOf,
} from '@reduxjs/toolkit'

import { client } from '../../api/client'

import { forceGenerateNotifications } from '../../api/server'

import { apiSlice } from '../api/apiSlice'

const notificationsReceived = createAction(
  'notifications/notificationsReceived'
)

export const extendedApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query({
      query: () => '/notifications',
      transformResponse: (res) => res.notifications,
      async onCacheEntryAdded(
        arg,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved, dispatch }
      ) {
        // create a websocket connection when the cache subscription starts
        const ws = new WebSocket('ws://localhost')
        try {
          // wait for the initial query to resolve before proceeding
          await cacheDataLoaded

          // when data is received from the socket connection to the server,
          // update our query result with the received message
          const listener = (event) => {
            const message = JSON.parse(event.data)
            switch (message.type) {
              case 'notifications': {
                updateCachedData((draft) => {
                  // Insert all received notifications from the websocket
                  // into the existing RTKQ cache array
                  draft.push(...message.payload)
                  draft.sort((a, b) => b.date.localeCompare(a.date))
                })
                dispatch(notificationsReceived(message.payload))
                break
              }
              default:
                break
            }
          }

          ws.addEventListener('message', listener)
        } catch {
          // no-op in case `cacheEntryRemoved` resolves before `cacheDataLoaded`,
          // in which case `cacheDataLoaded` will throw
        }
        // cacheEntryRemoved will resolve when the cache subscription is no longer active
        await cacheEntryRemoved
        // perform cleanup steps once the `cacheEntryRemoved` promise resolves
        ws.close()
      },
    }),
  }),
})

export const { useGetNotificationsQuery } = extendedApi

const emptyNotifications = []

export const selectNotificationsResult = extendedApi.endpoints.getNotifications.select()
const selectNotificationsData = createSelector(
  selectNotificationsResult,
  (notificationsResult) => notificationsResult.data ?? emptyNotifications
)

const notificationsAdapter = createEntityAdapter({})

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (_, { getState }) => {
    const allNotifications = selectAllNotifications(getState())
    const [latestNotification] = allNotifications
    const latestTimestamp = latestNotification ? latestNotification.date : ''
    const response = await client.get(
      `/fakeApi/notifications?since=${latestTimestamp}`
    )
    return response.notifications
  }
)

export const fetchNotificationsWebsocket = () => (dispatch, getState) => {
  const allNotifications = selectNotificationsData(getState())
  const [latestNotification] = allNotifications
  const latestTimestamp = latestNotification ? latestNotification.date : ''
  // Hardcode a call to the mock server to simulate a server push scenario over websockets
  forceGenerateNotifications(latestTimestamp)
}

const matchNotificationsReceived = isAnyOf(
  notificationsReceived,
  extendedApi.endpoints.getNotifications.matchFulfilled
)

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: notificationsAdapter.getInitialState(),
  reducers: {
    allNotificationsRead(state, action) {
      Object.values(state.entities).forEach((notification) => {
        notification.read = true
      })
    },
  },
  extraReducers(builder) {
    builder.addMatcher(matchNotificationsReceived, (state, action) => {
      Object.values(state.entities).forEach((notification) => {
        // Any notifications we've read are no longer new
        notification.isNew = !notification.read
      })

      const newNotificationEntries = action.payload.map((notification) => ({
        id: notification.id,
        isNew: true,
        read: false,
      }))
      notificationsAdapter.upsertMany(state, newNotificationEntries)
    })
  },
})

export const { allNotificationsRead } = notificationsSlice.actions

export default notificationsSlice.reducer

export const {
  selectAll: selectAllNotifications,
  selectById: selectNotificationById,
  selectEntities: selectNotificationsMetadata,
} = notificationsAdapter.getSelectors((state) => state.notifications)
