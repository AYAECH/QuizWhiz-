'use server';

/**
 * @fileOverview Generates educational feedback for incorrect quiz answers.
 *
 * - provideEducationalFeedback - A function that provides feedback for incorrect quiz answers.
 * - ProvideEducationalFeedbackInput - The input type for the provideEducationalFeedback function.
 * - ProvideEducationalFeedbackOutput - The return type for the provideEducationalFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProvideEducationalFeedbackInputSchema = z.object({
  question: z.string().describe('The quiz question.'),
  userAnswer: z.string().describe('The user\'s answer to the question.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  context: z.string().describe('Relevant context from the source document to help explain the answer.'),
});

export type ProvideEducationalFeedbackInput = z.infer<typeof ProvideEducationalFeedbackInputSchema>;

const ProvideEducationalFeedbackOutputSchema = z.object({
  explanation: z.string().describe('A clear and educational explanation of why the user\'s answer was incorrect and why the correct answer is correct.'),
});

export type ProvideEducationalFeedbackOutput = z.infer<typeof ProvideEducationalFeedbackOutputSchema>;

export async function provideEducationalFeedback(input: ProvideEducationalFeedbackInput): Promise<ProvideEducationalFeedbackOutput> {
  return provideEducationalFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'provideEducationalFeedbackPrompt',
  input: {schema: ProvideEducationalFeedbackInputSchema},
  output: {schema: ProvideEducationalFeedbackOutputSchema},
  prompt: `You are an expert educator providing feedback on quiz questions.

  A user answered the following question incorrectly. Provide a clear and educational explanation of why the user's answer was incorrect and why the correct answer is correct. Use the context provided to give a complete answer.

  Question: {{{question}}}
  User's Answer: {{{userAnswer}}}
  Correct Answer: {{{correctAnswer}}}
  Context: {{{context}}}`,
});

const provideEducationalFeedbackFlow = ai.defineFlow(
  {
    name: 'provideEducationalFeedbackFlow',
    inputSchema: ProvideEducationalFeedbackInputSchema,
    outputSchema: ProvideEducationalFeedbackOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
