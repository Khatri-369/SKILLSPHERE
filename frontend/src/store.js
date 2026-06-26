import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/authSlice';
import profileReducer from './features/profileSlice';
import gigReducer from './features/gigSlice';
import proposalReducer from './features/proposalSlice';
import chatReducer from './features/chatSlice';
import disputeReducer from './features/disputeSlice';
import analyticsReducer from './features/analyticsSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    gigs: gigReducer,
    proposal: proposalReducer,
    chat: chatReducer,
    disputes: disputeReducer,
    analytics: analyticsReducer,
  },
});

export default store;
