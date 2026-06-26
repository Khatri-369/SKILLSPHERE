import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../services/api';

export const applyToGig = createAsyncThunk(
  'proposal/apply',
  async (formData, thunkAPI) => {
    try {
      const response = await apiClient.post('/proposals', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const fetchMyProposals = createAsyncThunk(
  'proposal/fetchMyProposals',
  async (_, thunkAPI) => {
    try {
      const response = await apiClient.get('/proposals/me');
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const fetchProposalsForGig = createAsyncThunk(
  'proposal/fetchForGig',
  async (gigId, thunkAPI) => {
    try {
      const response = await apiClient.get(`/proposals/gig/${gigId}`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const acceptProposal = createAsyncThunk(
  'proposal/accept',
  async (proposalId, thunkAPI) => {
    try {
      const response = await apiClient.patch(`/proposals/${proposalId}/accept`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const rejectProposal = createAsyncThunk(
  'proposal/reject',
  async (proposalId, thunkAPI) => {
    try {
      const response = await apiClient.patch(`/proposals/${proposalId}/reject`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const negotiateProposal = createAsyncThunk(
  'proposal/negotiate',
  async ({ proposalId, negotiationData }, thunkAPI) => {
    try {
      const response = await apiClient.patch(`/proposals/${proposalId}/negotiate`, negotiationData);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const respondToNegotiation = createAsyncThunk(
  'proposal/respondNegotiation',
  async ({ proposalId, action }, thunkAPI) => {
    try {
      const response = await apiClient.patch(`/proposals/${proposalId}/negotiate/respond`, { action });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const withdrawProposal = createAsyncThunk(
  'proposal/withdraw',
  async (proposalId, thunkAPI) => {
    try {
      const response = await apiClient.patch(`/proposals/${proposalId}/withdraw`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);


const initialState = {
  proposals: [],
  myProposals: [],
  loading: false,
  error: null,
};

const proposalSlice = createSlice({
  name: 'proposal',
  initialState,
  reducers: {
    clearProposalErrors: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Apply
      .addCase(applyToGig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(applyToGig.fulfilled, (state, action) => {
        state.loading = false;
        state.myProposals.unshift(action.payload);
      })
      .addCase(applyToGig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch My Proposals
      .addCase(fetchMyProposals.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMyProposals.fulfilled, (state, action) => {
        state.loading = false;
        state.myProposals = action.payload;
      })
      // Fetch Proposals for Gig
      .addCase(fetchProposalsForGig.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProposalsForGig.fulfilled, (state, action) => {
        state.loading = false;
        state.proposals = action.payload;
      })
      // Accept / Reject / Negotiate Proposal
      .addCase(acceptProposal.fulfilled, (state, action) => {
        const index = state.proposals.findIndex((p) => p._id === action.payload._id);
        if (index !== -1) {
          state.proposals[index] = action.payload;
        }
      })
      .addCase(rejectProposal.fulfilled, (state, action) => {
        const index = state.proposals.findIndex((p) => p._id === action.payload._id);
        if (index !== -1) {
          state.proposals[index] = action.payload;
        }
      })
      .addCase(negotiateProposal.fulfilled, (state, action) => {
        const index = state.proposals.findIndex((p) => p._id === action.payload._id);
        if (index !== -1) {
          state.proposals[index] = action.payload;
        }
      })
      .addCase(respondToNegotiation.fulfilled, (state, action) => {
        const index = state.myProposals.findIndex((p) => p._id === action.payload._id);
        if (index !== -1) {
          state.myProposals[index] = action.payload;
        }
      })
      .addCase(withdrawProposal.fulfilled, (state, action) => {
        const index = state.myProposals.findIndex((p) => p._id === action.payload._id);
        if (index !== -1) {
          state.myProposals[index] = action.payload;
        }
      });
  },
});

export const { clearProposalErrors } = proposalSlice.actions;
export default proposalSlice.reducer;
