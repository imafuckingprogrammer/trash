// AI functionality temporarily disabled to fix module resolution issues
// TODO: Install genkit and @genkit-ai/googleai dependencies when AI features are needed

/*
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
});
*/

// Placeholder export to prevent import errors
export const ai = {
  disabled: true,
  message: 'AI functionality is currently disabled. Install genkit dependencies to enable.'
};
