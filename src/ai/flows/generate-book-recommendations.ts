// This is a server-side file.
'use server';

/**
 * @fileOverview Generates personalized book recommendations based on user reading history and preferences.
 *
 * - generateBookRecommendations - A function that takes user reading history and preferences as input and returns a list of book recommendations.
 * - GenerateBookRecommendationsInput - The input type for the generateBookRecommendations function.
 * - GenerateBookRecommendationsOutput - The return type for the generateBookRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBookRecommendationsInputSchema = z.object({
  readingHistory: z
    .string()
    .describe(
      'A detailed history of the user reading, including titles, authors, genres, and ratings.'
    ),
  preferences: z
    .string()
    .describe('The user preferences, such as preferred genres, authors, and reading styles.'),
});
export type GenerateBookRecommendationsInput = z.infer<
  typeof GenerateBookRecommendationsInputSchema
>;

const GenerateBookRecommendationsOutputSchema = z.object({
  recommendations: z
    .array(z.string())
    .describe('A list of book recommendations based on the user reading history and preferences.'),
});
export type GenerateBookRecommendationsOutput = z.infer<
  typeof GenerateBookRecommendationsOutputSchema
>;

export async function generateBookRecommendations(
  input: GenerateBookRecommendationsInput
): Promise<GenerateBookRecommendationsOutput> {
  return generateBookRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBookRecommendationsPrompt',
  input: {schema: GenerateBookRecommendationsInputSchema},
  output: {schema: GenerateBookRecommendationsOutputSchema},
  prompt: `You are a book recommendation expert.

  Based on the user's reading history and preferences, provide a list of book recommendations that the user might enjoy.
  Do not include books already present in their reading history.

  Reading History: {{{readingHistory}}}
  Preferences: {{{preferences}}}

  Return the recommendations as a list of book titles.`,
});

const generateBookRecommendationsFlow = ai.defineFlow(
  {
    name: 'generateBookRecommendationsFlow',
    inputSchema: GenerateBookRecommendationsInputSchema,
    outputSchema: GenerateBookRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
