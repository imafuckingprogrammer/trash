import { config } from 'dotenv';
config();

import '@/ai/flows/generate-book-recommendations.ts';

// AI dev functionality temporarily disabled to fix module resolution issues
// TODO: Install genkit dependencies when AI features are needed

/*
import {ai} from './genkit';

ai.startFlowServer({
  flows: [generateBookRecommendationsFlow],
});
*/

// Placeholder to prevent import errors
console.log('AI dev server is disabled. Install genkit dependencies to enable AI features.');