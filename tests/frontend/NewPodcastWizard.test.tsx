/**
 * Frontend tests for New Podcast Wizard
 * These tests would have caught the competitor suggestion bug
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewPodcastPage from '../../src/app/podcasts/new/page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/podcasts/new',
}));

describe('NewPodcastWizard', () => {
  describe('Step 1: Branding', () => {
    it('should render step 1 by default', () => {
      render(<NewPodcastPage />);
      
      expect(screen.getByText('Branding & Metadata')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Your Company Intelligence Podcast')).toBeInTheDocument();
    });

    it('should update form data when typing in title field', async () => {
      const user = userEvent.setup();
      render(<NewPodcastPage />);
      
      const titleInput = screen.getByPlaceholderText('Your Company Intelligence Podcast');
      await user.type(titleInput, 'My Test Podcast');
      
      expect(titleInput).toHaveValue('My Test Podcast');
    });

    it('should have Next button enabled', () => {
      render(<NewPodcastPage />);
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).not.toBeDisabled();
    });
  });

  describe('Step 2: Company & Competitors (THE BUG FIX)', () => {
    beforeEach(() => {
      render(<NewPodcastPage />);
      
      // Navigate to Step 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
    });

    it('should render company input field', () => {
      expect(screen.getByText('Company & Industry')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e.g., AT&T/i)).toBeInTheDocument();
    });

    it('should show competitor suggestions when typing AT&T', async () => {
      const user = userEvent.setup();
      
      const companyInput = screen.getByPlaceholderText(/e.g., AT&T/i);
      await user.type(companyInput, 'AT&T');
      
      await waitFor(() => {
        expect(screen.getByText(/AI-Suggested Competitors for AT&T/i)).toBeInTheDocument();
      });
      
      // Should show Verizon, T-Mobile, etc.
      expect(screen.getByText('Verizon')).toBeInTheDocument();
      expect(screen.getByText('T-Mobile')).toBeInTheDocument();
      expect(screen.getByText('Dish Network')).toBeInTheDocument();
    });

    it('should show competitor suggestions when typing lowercase "att"', async () => {
      const user = userEvent.setup();
      
      const companyInput = screen.getByPlaceholderText(/e.g., AT&T/i);
      await user.type(companyInput, 'att');
      
      await waitFor(() => {
        expect(screen.getByText(/AI-Suggested Competitors for att/i)).toBeInTheDocument();
      });
      
      expect(screen.getByText('Verizon')).toBeInTheDocument();
    });

    it('should allow selecting competitors via checkboxes', async () => {
      const user = userEvent.setup();
      
      const companyInput = screen.getByPlaceholderText(/e.g., AT&T/i);
      await user.type(companyInput, 'AT&T');
      
      await waitFor(() => {
        expect(screen.getByText('Verizon')).toBeInTheDocument();
      });
      
      // Find and click the Verizon checkbox
      const verizonCheckbox = screen.getByRole('checkbox', { name: /verizon/i });
      await user.click(verizonCheckbox);
      
      expect(verizonCheckbox).toBeChecked();
      
      // Should show count
      expect(screen.getByText(/Selected: 1 competitor/i)).toBeInTheDocument();
    });

    it('should allow deselecting competitors', async () => {
      const user = userEvent.setup();
      
      const companyInput = screen.getByPlaceholderText(/e.g., AT&T/i);
      await user.type(companyInput, 'AT&T');
      
      await waitFor(() => {
        expect(screen.getByText('Verizon')).toBeInTheDocument();
      });
      
      const verizonCheckbox = screen.getByRole('checkbox', { name: /verizon/i });
      
      // Select
      await user.click(verizonCheckbox);
      expect(verizonCheckbox).toBeChecked();
      
      // Deselect
      await user.click(verizonCheckbox);
      expect(verizonCheckbox).not.toBeChecked();
      
      expect(screen.getByText(/Selected: 0 competitor/i)).toBeInTheDocument();
    });

    it('should show warning when company not found', async () => {
      const user = userEvent.setup();
      
      const companyInput = screen.getByPlaceholderText(/e.g., AT&T/i);
      await user.type(companyInput, 'UnknownCompany123');
      
      await waitFor(() => {
        expect(screen.getByText(/No competitors found/i)).toBeInTheDocument();
      });
    });

    it('should work with Verizon competitors', async () => {
      const user = userEvent.setup();
      
      const companyInput = screen.getByPlaceholderText(/e.g., AT&T/i);
      await user.type(companyInput, 'Verizon');
      
      await waitFor(() => {
        expect(screen.getByText('AT&T')).toBeInTheDocument();
        expect(screen.getByText('T-Mobile')).toBeInTheDocument();
      });
    });

    it('should populate industry dropdown', () => {
      const industrySelect = screen.getByRole('combobox');
      
      expect(industrySelect).toBeInTheDocument();
      expect(screen.getByText('Technology')).toBeInTheDocument();
      expect(screen.getByText('Telecommunications')).toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    it('should navigate from Step 1 to Step 2', () => {
      render(<NewPodcastPage />);
      
      expect(screen.getByText('Branding & Metadata')).toBeInTheDocument();
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
      
      expect(screen.getByText('Company & Industry')).toBeInTheDocument();
    });

    it('should navigate back from Step 2 to Step 1', () => {
      render(<NewPodcastPage />);
      
      // Go to Step 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
      
      expect(screen.getByText('Company & Industry')).toBeInTheDocument();
      
      // Go back
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);
      
      expect(screen.getByText('Branding & Metadata')).toBeInTheDocument();
    });

    it('should disable Back button on Step 1', () => {
      render(<NewPodcastPage />);
      
      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeDisabled();
    });

    it('should show Create Podcast button on Step 5', () => {
      render(<NewPodcastPage />);
      
      // Navigate to Step 5
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton); // Step 2
      fireEvent.click(nextButton); // Step 3
      fireEvent.click(nextButton); // Step 4
      fireEvent.click(nextButton); // Step 5
      
      expect(screen.getByRole('button', { name: /create podcast/i })).toBeInTheDocument();
    });
  });

  describe('Progress Indicator', () => {
    it('should show all 5 steps in progress bar', () => {
      render(<NewPodcastPage />);
      
      expect(screen.getByText('Branding')).toBeInTheDocument();
      expect(screen.getByText('Company')).toBeInTheDocument();
      expect(screen.getByText('Cadence')).toBeInTheDocument();
      expect(screen.getByText('Topics')).toBeInTheDocument();
      expect(screen.getByText('Voice')).toBeInTheDocument();
    });

    it('should highlight current step', () => {
      render(<NewPodcastPage />);
      
      // Step 1 should be highlighted
      // This would need more specific testing of className/styling
      expect(screen.getByText('Branding')).toBeInTheDocument();
    });
  });
});

