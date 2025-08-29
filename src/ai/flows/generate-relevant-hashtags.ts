'use server';

/**
 * @fileOverview A flow that generates relevant hashtags for a post based on its content.
 *
 * - generateRelevantHashtags - A function that handles the hashtag generation process.
 * - GenerateRelevantHashtagsInput - The input type for the generateRelevantHashtags function.
 * - GenerateRelevantHashtagsOutput - The return type for the generateRelevantHashtags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRelevantHashtagsInputSchema = z.object({
  postContent: z
    .string()
    .describe('The text content of the post for which to generate hashtags.'),
});
export type GenerateRelevantHashtagsInput = z.infer<
  typeof GenerateRelevantHashtagsInputSchema
>;

const GenerateRelevantHashtagsOutputSchema = z.object({
  hashtags: z
    .array(z.string())
    .describe('An array of relevant hashtags for the post.'),
});
export type GenerateRelevantHashtagsOutput = z.infer<
  typeof GenerateRelevantHashtagsOutputSchema
>;

export async function generateRelevantHashtags(
  input: GenerateRelevantHashtagsInput
): Promise<GenerateRelevantHashtagsOutput> {
  return generateRelevantHashtagsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRelevantHashtagsPrompt',
  input: {schema: GenerateRelevantHashtagsInputSchema},
  output: {schema: GenerateRelevantHashtagsOutputSchema},
  prompt: `You are a social media expert. Generate a list of relevant hashtags for the following post content:

Content: {{{postContent}}}

Hashtags:`,
});

const generateRelevantHashtagsFlow = ai.defineFlow(
  {
    name: 'generateRelevantHashtagsFlow',
    inputSchema: GenerateRelevantHashtagsInputSchema,
    outputSchema: GenerateRelevantHashtagsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
