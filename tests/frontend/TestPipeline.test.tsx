/**
 * Frontend tests for Test Pipeline page
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TestPipelinePage from '../../src/app/test-pipeline/page';

describe('TestPipelinePage', () => {
  beforeEach(() => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    });
    
    // Mock window.open
    global.window.open = jest.fn();
  });

  describe('Page Rendering', () => {
    it('should render the page title and description', () => {
      render(<TestPipelinePage />);
      
      expect(screen.getByText('Test Pipeline')).toBeInTheDocument();
      expect(screen.getByText('Run individual pipeline stages interactively')).toBeInTheDocument();
    });

    it('should show all 13 pipeline stages', () => {
      render(<TestPipelinePage />);
      
      // Check for stage names (they're prefixed with "Stage X:")
      expect(screen.getByText(/Stage 1: Prepare/i)).toBeInTheDocument();
      expect(screen.getByText(/Stage 2: Discover/i)).toBeInTheDocument();
      expect(screen.getByText(/Stage 3: Disambiguate/i)).toBeInTheDocument();
      expect(screen.getByText(/Stage 4: Rank/i)).toBeInTheDocument();
      expect(screen.getByText(/Stage 5: Scrape/i)).toBeInTheDocument();
      expect(screen.getByText(/Stage 6: Extract Evidence/i)).toBeInTheDocument();
      expect(screen.getByText(/Stage 7: Summarize/i)).toBeInTheDocument();
      expect(screen.getByText(/Stage 8: Competitor Contrast/i)).toBeInTheDocument();
      expect(screen.getByText(/Stage 9: Outline/i)).toBeInTheDocument();
      expect(screen.getByText(/Stage 10: Script/i)).toBeInTheDocument();
      expect(screen.getByText(/Stage 11: QA & Bind/i)).toBeInTheDocument();
      expect(screen.getByText(/Stage 12: TTS Render/i)).toBeInTheDocument();
      expect(screen.getByText(/Stage 13: Package & RSS/i)).toBeInTheDocument();
    });

    it('should have prepare stage selected by default', () => {
      render(<TestPipelinePage />);
      
      // The prepare button should have the selected styling
      const prepareButton = screen.getByText(/Stage 1: Prepare/i).closest('button');
      expect(prepareButton).toHaveClass('bg-green-600');
    });
  });

  describe('Stage Selection', () => {
    it('should change selected stage when clicking a stage button', async () => {
      const user = userEvent.setup();
      render(<TestPipelinePage />);
      
      // Click on Discover stage
      const discoverButton = screen.getByText(/Stage 2: Discover/i).closest('button');
      if (discoverButton) {
        await user.click(discoverButton);
      }
      
      // Should show discover stage info
      expect(screen.getByText(/RSS\/news APIs/i)).toBeInTheDocument();
    });

    it('should update input/output file paths when changing stage', async () => {
      const user = userEvent.setup();
      render(<TestPipelinePage />);
      
      // Initial state (prepare)
      expect(screen.getAllByText('fixtures/prepare/in.json')[0]).toBeInTheDocument();
      expect(screen.getAllByText('fixtures/prepare/out.json')[0]).toBeInTheDocument();
      
      // Click on Discover
      const discoverButton = screen.getByText(/Stage 2: Discover/i).closest('button');
      if (discoverButton) {
        await user.click(discoverButton);
      }
      
      // Should update paths
      await waitFor(() => {
        expect(screen.getAllByText('fixtures/discover/in.json')[0]).toBeInTheDocument();
        expect(screen.getAllByText('fixtures/discover/out.json')[0]).toBeInTheDocument();
      });
    });
  });

  describe('Mode Selection', () => {
    it('should render Free Mode and Real AI Mode buttons', () => {
      render(<TestPipelinePage />);
      
      expect(screen.getByText(/Free Mode/i)).toBeInTheDocument();
      expect(screen.getByText(/Real AI Mode/i)).toBeInTheDocument();
    });

    it('should have Free Mode selected by default', () => {
      render(<TestPipelinePage />);
      
      const freeModeButton = screen.getByText(/Free Mode/i).closest('button');
      expect(freeModeButton).toHaveClass('border-green-500');
    });

    it('should switch to Real AI Mode when clicked', async () => {
      const user = userEvent.setup();
      render(<TestPipelinePage />);
      
      const realAiButton = screen.getByText(/Real AI Mode/i).closest('button');
      if (realAiButton) {
        await user.click(realAiButton);
      }
      
      // Should update provider in command
      await waitFor(() => {
        const commandPreview = screen.getByText(/npm run run-stage/);
        expect(commandPreview.textContent).toContain('--llm openai');
      });
    });
  });

  describe('Command Generation', () => {
    it('should generate correct npm command for prepare stage', () => {
      render(<TestPipelinePage />);
      
      const commandText = screen.getByText(/npm run run-stage/);
      expect(commandText.textContent).toContain('--stage prepare');
      expect(commandText.textContent).toContain('--in fixtures/prepare/in.json');
      expect(commandText.textContent).toContain('--out fixtures/prepare/out.json');
      expect(commandText.textContent).toContain('--llm replay');
      expect(commandText.textContent).toContain('--tts stub');
      expect(commandText.textContent).toContain('--http replay');
    });

    it('should copy command to clipboard when copy button is clicked', async () => {
      const user = userEvent.setup();
      render(<TestPipelinePage />);
      
      const copyButton = screen.getByTitle(/copy.*clipboard/i);
      await user.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('npm run run-stage')
      );
    });
  });

  describe('File Links', () => {
    it('should render clickable input file link', () => {
      render(<TestPipelinePage />);
      
      const inputFileButton = screen.getAllByText('fixtures/prepare/in.json')[0];
      expect(inputFileButton).toBeInTheDocument();
      expect(inputFileButton.tagName).toBe('BUTTON');
    });

    it('should render clickable output file link', () => {
      render(<TestPipelinePage />);
      
      const outputFileButton = screen.getAllByText('fixtures/prepare/out.json')[0];
      expect(outputFileButton).toBeInTheDocument();
      expect(outputFileButton.tagName).toBe('BUTTON');
    });

    it('should copy file path and attempt to open when clicking file link', async () => {
      const user = userEvent.setup();
      render(<TestPipelinePage />);
      
      const inputFileButton = screen.getAllByText('fixtures/prepare/in.json')[0];
      await user.click(inputFileButton);
      
      // Should copy to clipboard
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      
      // Should attempt to open in editor
      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('cursor://file/'),
        '_blank'
      );
    });
  });

  describe('Run Stage Button', () => {
    it('should render Run Stage button', () => {
      render(<TestPipelinePage />);
      
      const runButton = screen.getByRole('button', { name: /run stage/i });
      expect(runButton).toBeInTheDocument();
      expect(runButton).not.toBeDisabled();
    });

    it('should show loading state when running', async () => {
      const user = userEvent.setup();
      render(<TestPipelinePage />);
      
      const runButton = screen.getByRole('button', { name: /run stage/i });
      await user.click(runButton);
      
      // Should show running state
      await waitFor(() => {
        expect(screen.getByText(/running/i)).toBeInTheDocument();
      });
    });

    it('should show success result after running', async () => {
      const user = userEvent.setup();
      render(<TestPipelinePage />);
      
      const runButton = screen.getByRole('button', { name: /run stage/i });
      await user.click(runButton);
      
      // Wait for success
      await waitFor(() => {
        expect(screen.getByText(/completed successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display duration after completion', async () => {
      const user = userEvent.setup();
      render(<TestPipelinePage />);
      
      const runButton = screen.getByRole('button', { name: /run stage/i });
      await user.click(runButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Duration:/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Instructions Section', () => {
    it('should render how to run instructions', () => {
      render(<TestPipelinePage />);
      
      expect(screen.getByText(/How to Run in Terminal/i)).toBeInTheDocument();
      expect(screen.getByText(/Copy the command above/i)).toBeInTheDocument();
      expect(screen.getByText(/Open your terminal/i)).toBeInTheDocument();
    });
  });

  describe('Stage Info Display', () => {
    it('should show stage description', () => {
      render(<TestPipelinePage />);
      
      // Should show description for prepare stage
      expect(screen.getByText(/calculates budgets/i)).toBeInTheDocument();
    });

    it('should show input and output file paths', () => {
      render(<TestPipelinePage />);
      
      expect(screen.getByText(/Input:/i)).toBeInTheDocument();
      expect(screen.getByText(/Output:/i)).toBeInTheDocument();
    });

    it('should show Ready status for stages with fixtures', () => {
      render(<TestPipelinePage />);
      
      // All stages now have fixtures, so should show "Ready to run"
      expect(screen.getByText(/Ready to run/i)).toBeInTheDocument();
    });
  });
});

