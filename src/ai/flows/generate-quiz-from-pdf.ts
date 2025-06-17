
'use server';
/**
 * @fileOverview Generates a multiple-choice quiz and flash information from one or more PDF documents.
 *
 * - generateQuizFromPdf - A function that handles the quiz and flash info generation process.
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
  numQuestions: z.number().int().min(5).max(1000).describe("The desired number of questions to generate, between 5 and 1000."),
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
  flashInformation: z.string().optional().describe('A concise summary or interesting facts extracted from the PDF documents, suitable for quick learning.'),
});
export type GenerateQuizFromPdfOutput = z.infer<typeof GenerateQuizFromPdfOutputSchema>;

export async function generateQuizFromPdf(input: GenerateQuizFromPdfInput): Promise<GenerateQuizFromPdfOutput> {
  if (!input.pdfDataUris || input.pdfDataUris.length === 0) {
    throw new Error('No PDF documents provided.');
  }
  if (input.numQuestions < 5 || input.numQuestions > 1000) {
    throw new Error('Number of questions must be between 5 and 1000.');
  }
  return generateQuizFromPdfFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizFromPdfPrompt',
  input: {schema: GenerateQuizFromPdfInputSchema},
  output: {schema: GenerateQuizFromPdfOutputSchema},
  prompt: `You are an expert content generator. Your task is to meticulously analyze the content from ALL the provided PDF documents.
Based on this analysis, you will produce JSON output with two main fields: 'quiz' and 'flashInformation'.

1.  **Quiz Generation ('quiz' field):**
    *   Generate exactly {{{numQuestions}}} multiple-choice quiz questions.
    *   It is crucial that each quiz you generate is significantly different from any previous one, even if based on the same documents. Strive for originality in question formulation, topic selection, and the construction of distractors. Make sure the questions are not too similar to each other within the same quiz.
    *   Each question must have 4 distinct answer options.
    *   Only one option can be the correct answer.
    *   Ensure questions cover a wide and diverse range of topics from the documents. Avoid concentrating on a single section or repeating concepts excessively.
    *   The questions themselves should be distinct from one another within the same quiz.
    *   Phrase questions clearly and unambiguously.
    *   The correct answer must be directly and clearly verifiable from the provided document content.

2.  **Flash Information Generation ('flashInformation' field):**
    *   Provide a concise summary (e.g., 2-4 paragraphs, or a few bullet points) of the most important facts, key takeaways, or interesting snippets from ALL provided documents.
    *   This information is for quick learning.
    *   This flash information MUST be a string in the 'flashInformation' field of the JSON output. STRIVE TO EXTRACT USEFUL INFORMATION. If, after thorough analysis, no suitable summary or key facts can be extracted, you may return a very brief message like "No specific flash information could be extracted from the provided document(s)." but this should be a last resort.

Output format must be JSON.

{{#if pdfDataUris}}
Here are the PDF documents:
{{#each pdfDataUris}}
Document Content:
{{media url=this}}
--- End of Document Content ---
{{/each}}
{{else}}
Error: No PDF documents were provided in the input. Cannot generate content.
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
    if (!output.flashInformation || output.flashInformation.trim() === "" || output.flashInformation.toLowerCase().includes("no specific flash information could be extracted")) {
        console.warn('AI did not generate meaningful flash information.');
        // Ensure flashInformation is set to undefined if it's not useful, so downstream logic handles it as "not available"
        if (output.flashInformation && (output.flashInformation.trim() === "" || output.flashInformation.toLowerCase().includes("no specific flash information could be extracted"))) {
          output.flashInformation = undefined;
        }
    }
    return output!;
  }
);
