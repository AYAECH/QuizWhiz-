'use server';
/**
 * @fileOverview Generates a multiple-choice quiz from one or more PDF documents.
 *
 * - generateQuizFromPdf - A function that handles the quiz generation process.
 * - GenerateQuizFromPdfInput - The input type for the generateQuizFromPdf function.
 * - GenerateQuizFromPdfOutput - The return type for the generateQuizFromPdf function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizFromPdfInputSchema = z.object({
  pdfDataUris: z.array(z
    .string()
    .describe(
      "A PDF document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    )).describe('An array of PDF documents as data URIs.'),
  numQuestions: z.number().int().min(5).max(50).describe("The desired number of questions to generate, between 5 and 50."),
});
export type GenerateQuizFromPdfInput = z.infer<typeof GenerateQuizFromPdfInputSchema>;

const GenerateQuizFromPdfOutputSchema = z.object({
  quiz: z.array(
    z.object({
      question: z.string().describe('The quiz question.'),
      options: z.array(z.string()).describe('The multiple-choice options for the question.'),
      answer: z.string().describe('The correct answer to the question.'),
    })
  ).describe('The generated quiz questions and answers.'),
});
export type GenerateQuizFromPdfOutput = z.infer<typeof GenerateQuizFromPdfOutputSchema>;

export async function generateQuizFromPdf(input: GenerateQuizFromPdfInput): Promise<GenerateQuizFromPdfOutput> {
  if (!input.pdfDataUris || input.pdfDataUris.length === 0) {
    throw new Error('No PDF documents provided.');
  }
  if (input.numQuestions < 5 || input.numQuestions > 50) {
    throw new Error('Number of questions must be between 5 and 50.');
  }
  return generateQuizFromPdfFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizFromPdfPrompt',
  input: {schema: GenerateQuizFromPdfInputSchema},
  output: {schema: GenerateQuizFromPdfOutputSchema},
  prompt: `You are an expert quiz generator tasked with creating high-quality, unique quizzes.
Your task is to meticulously analyze the content from ALL the provided PDF documents and generate exactly {{{numQuestions}}} multiple-choice quiz questions.

It is crucial that each quiz you generate is significantly different from any previous one, even if based on the same documents. Strive for originality in question formulation, topic selection, and the construction of distractors. Make sure the questions are not too similar to each other within the same quiz.

For each quiz:
1.  Generate exactly {{{numQuestions}}} questions.
2.  Each question must have 4 distinct answer options.
3.  Only one option can be the correct answer.
4.  Ensure questions cover a wide and diverse range of topics from the documents. Avoid concentrating on a single section or repeating concepts excessively.
5.  The questions themselves should be distinct from one another within the same quiz.
6.  Phrase questions clearly and unambiguously.
7.  The correct answer must be directly and clearly verifiable from the provided document content.

Output format must be JSON.

{{#if pdfDataUris}}
Here are the PDF documents:
{{#each pdfDataUris}}
Document Content:
{{media url=this}}
--- End of Document Content ---
{{/each}}
{{else}}
Error: No PDF documents were provided in the input. Cannot generate quiz.
{{/if}}
  `,
});

const generateQuizFromPdfFlow = ai.defineFlow(
  {
    name: 'generateQuizFromPdfFlow',
    inputSchema: GenerateQuizFromPdfInputSchema,
    outputSchema: GenerateQuizFromPdfOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output || !output.quiz || output.quiz.length === 0) {
      throw new Error('AI failed to generate quiz questions or returned an empty quiz.');
    }
    // Ensure the number of questions is close to requested, models might not be exact
    // but this provides a basic check.
    if (output.quiz.length < Math.max(1, input.numQuestions / 2)) {
        console.warn(`AI generated only ${output.quiz.length} questions, less than half of the requested ${input.numQuestions}.`);
    }
    return output!;
  }
);
