import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../services/api';

export const fetchChatHistory = createAsyncThunk(
  'chat/fetchHistory',
  async ({ userId, page = 1, limit = 20 }, thunkAPI) => {
    try {
      const response = await apiClient.get(`/chat/history/${userId}`, {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const uploadChatImage = createAsyncThunk(
  'chat/uploadImage',
  async (formData, thunkAPI) => {
    try {
      const response = await apiClient.post('/chat/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data; // secure_url
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

const initialState = {
  messages: [],
  pagination: null,
  onlineUsers: [],
  typingStatus: { isTyping: false, senderId: null },
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    clearChatErrors: (state) => {
      state.error = null;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    setTypingStatus: (state, action) => {
      state.typingStatus = action.payload;
    },
    resetChat: (state) => {
      state.messages = [];
      state.pagination = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatHistory.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchChatHistory.fulfilled, (state, action) => {
        state.loading = false;
        // Prepend history (older messages first)
        state.messages = action.payload.messages.reverse();
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchChatHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearChatErrors, addMessage, setOnlineUsers, setTypingStatus, resetChat } = chatSlice.actions;
export default chatSlice.reducer;
