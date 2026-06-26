import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../services/api';

export const fetchClientAnalytics = createAsyncThunk(
  'analytics/fetchClient',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get('/analytics/client');
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const fetchFreelancerAnalytics = createAsyncThunk(
  'analytics/fetchFreelancer',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get('/analytics/freelancer');
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const fetchAdminAnalytics = createAsyncThunk(
  'analytics/fetchAdmin',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get('/admin/analytics');
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

const initialState = {
  clientStats: null,
  freelancerStats: null,
  adminStats: null,
  loading: false,
  error: null,
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearAnalyticsErrors: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Client
      .addCase(fetchClientAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.clientStats = action.payload;
      })
      .addCase(fetchClientAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Freelancer
      .addCase(fetchFreelancerAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFreelancerAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.freelancerStats = action.payload;
      })
      .addCase(fetchFreelancerAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Admin
      .addCase(fetchAdminAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.adminStats = action.payload;
      })
      .addCase(fetchAdminAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearAnalyticsErrors } = analyticsSlice.actions;
export default analyticsSlice.reducer;
