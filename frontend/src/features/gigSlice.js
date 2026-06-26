import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../services/api';

export const searchGigs = createAsyncThunk(
  'gigs/search',
  async (params = {}, thunkAPI) => {
    try {
      const response = await apiClient.get('/search/gigs', { params });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const createGig = createAsyncThunk(
  'gigs/create',
  async (gigData, thunkAPI) => {
    try {
      // Multipart/form-data supports file attachments
      const response = await apiClient.post('/gigs', gigData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const editGig = createAsyncThunk(
  'gigs/edit',
  async ({ gigId, gigData }, thunkAPI) => {
    try {
      const response = await apiClient.patch(`/gigs/${gigId}`, gigData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const deleteGig = createAsyncThunk(
  'gigs/delete',
  async (gigId, thunkAPI) => {
    try {
      await apiClient.delete(`/gigs/${gigId}`);
      return gigId;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const publishGig = createAsyncThunk(
  'gigs/publish',
  async (gigId, thunkAPI) => {
    try {
      const response = await apiClient.patch(`/gigs/${gigId}/publish`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const closeGig = createAsyncThunk(
  'gigs/close',
  async (gigId, thunkAPI) => {
    try {
      const response = await apiClient.patch(`/gigs/${gigId}/close`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

const initialState = {
  gigs: [],
  pagination: null,
  currentGig: null,
  loading: false,
  error: null,
};

const gigSlice = createSlice({
  name: 'gigs',
  initialState,
  reducers: {
    clearGigErrors: (state) => {
      state.error = null;
    },
    setCurrentGig: (state, action) => {
      state.currentGig = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Search Gigs
      .addCase(searchGigs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchGigs.fulfilled, (state, action) => {
        state.loading = false;
        state.gigs = action.payload.gigs;
        state.pagination = action.payload.pagination;
      })
      .addCase(searchGigs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Gig
      .addCase(createGig.pending, (state) => {
        state.loading = true;
      })
      .addCase(createGig.fulfilled, (state, action) => {
        state.loading = false;
        state.gigs.unshift(action.payload);
      })
      .addCase(createGig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Edit Gig
      .addCase(editGig.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.gigs.findIndex((g) => g._id === action.payload._id);
        if (index !== -1) {
          state.gigs[index] = action.payload;
        }
      })
      // Delete Gig
      .addCase(deleteGig.fulfilled, (state, action) => {
        state.gigs = state.gigs.filter((g) => g._id !== action.payload);
      })
      // Publish Gig
      .addCase(publishGig.fulfilled, (state, action) => {
        const index = state.gigs.findIndex((g) => g._id === action.payload._id);
        if (index !== -1) {
          state.gigs[index] = action.payload;
        }
      })
      // Close Gig
      .addCase(closeGig.fulfilled, (state, action) => {
        const index = state.gigs.findIndex((g) => g._id === action.payload._id);
        if (index !== -1) {
          state.gigs[index] = action.payload;
        }
      });
  },
});

export const { clearGigErrors, setCurrentGig } = gigSlice.actions;
export default gigSlice.reducer;
