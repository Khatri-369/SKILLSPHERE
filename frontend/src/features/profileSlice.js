import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../services/api';

export const fetchProfileMe = createAsyncThunk(
  'profile/fetchMe',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get('/freelancers/me');
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const fetchProfileById = createAsyncThunk(
  'profile/fetchById',
  async (userId, thunkAPI) => {
    try {
      const response = await apiClient.get(`/freelancers/${userId}`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const createProfile = createAsyncThunk(
  'profile/create',
  async (profileData, thunkAPI) => {
    try {
      const response = await apiClient.post('/freelancers', profileData);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const updateProfile = createAsyncThunk(
  'profile/update',
  async (profileData, thunkAPI) => {
    try {
      const response = await apiClient.patch('/freelancers', profileData);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

const initialState = {
  myProfile: null,
  publicProfile: null,
  loading: false,
  error: null,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearProfileErrors: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Own Profile
      .addCase(fetchProfileMe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfileMe.fulfilled, (state, action) => {
        state.loading = false;
        state.myProfile = action.payload;
      })
      .addCase(fetchProfileMe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Public Profile By Id
      .addCase(fetchProfileById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfileById.fulfilled, (state, action) => {
        state.loading = false;
        state.publicProfile = action.payload;
      })
      .addCase(fetchProfileById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Profile
      .addCase(createProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.myProfile = action.payload;
      })
      .addCase(createProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.myProfile = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearProfileErrors } = profileSlice.actions;
export default profileSlice.reducer;
