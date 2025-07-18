import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

// Mock the auth store
jest.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    user: null,
    isLoading: false,
    isInitialized: true,
    hasCompletedOnboarding: true,
  }),
  initializeAuth: jest.fn(),
}));

describe('App', () => {
  it('renders without crashing', () => {
    const { getByText } = render(<App />);
    expect(getByText('Loading...')).toBeTruthy();
  });
});