import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../services/api';

export const raiseDispute = createAsyncThunk(
  'disputes/raise',
  async (formData, thunkAPI) => {
    try {
      const response = await apiClient.post('/disputes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const fetchMyDisputes = createAsyncThunk(
  'disputes/fetchMy',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get('/disputes/me');
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const fetchDisputeById = createAsyncThunk(
  'disputes/fetchById',
  async (disputeId, thunkAPI) => {
    try {
      const response = await apiClient.get(`/disputes/${disputeId}`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const closeDispute = createAsyncThunk(
  'disputes/close',
  async (disputeId, thunkAPI) => {
    try {
      const response = await apiClient.patch(`/disputes/${disputeId}/close`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const resolveDispute = createAsyncThunk(
  'disputes/resolve',
  async ({ disputeId, resolutionData }, thunkAPI) => {
    try {
      const response = await apiClient.patch(`/disputes/${disputeId}/resolve`, resolutionData);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const fetchAllDisputes = createAsyncThunk(
  'disputes/fetchAll',
  async (params = {}, thunkAPI) => {
    try {
      const response = await apiClient.get('/disputes', { params });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

const initialState = {
  disputes: [],
  currentDispute: null,
  loading: false,
  error: null,
};

const disputeSlice = createSlice({
  name: 'disputes',
  initialState,
  reducers: {
    clearDisputeErrors: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Raise Dispute
      .addCase(raiseDispute.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(raiseDispute.fulfilled, (state, action) => {
        state.loading = false;
        state.disputes.unshift(action.payload);
      })
      .addCase(raiseDispute.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch My Disputes
      .addCase(fetchMyDisputes.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMyDisputes.fulfilled, (state, action) => {
        state.loading = false;
        state.disputes = action.payload.disputes;
      })
      // Fetch Dispute by ID
      .addCase(fetchDisputeById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDisputeById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDispute = action.payload;
      })
      // Close Own Dispute
      .addCase(closeDispute.fulfilled, (state, action) => {
        state.currentDispute = action.payload;
        const index = state.disputes.findIndex((d) => d._id === action.payload._id);
        if (index !== -1) {
          state.disputes[index] = action.payload;
        }
      })
      // Admin Resolve Dispute
      .addCase(resolveDispute.fulfilled, (state, action) => {
        state.currentDispute = action.payload;
        const index = state.disputes.findIndex((d) => d._id === action.payload._id);
        if (index !== -1) {
          state.disputes[index] = action.payload;
        }
      })
      // Admin Get All Disputes
      .addCase(fetchAllDisputes.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllDisputes.fulfilled, (state, action) => {
        state.loading = false;
        state.disputes = action.payload.disputes;
      });
  },
});

export const { clearDisputeErrors } = disputeSlice.actions;
export default disputeSlice.reducer;
