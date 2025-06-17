
'use server';

/**
 * @fileOverview Génère un feedback éducatif et une suggestion d'étude en français pour les réponses incorrectes aux quiz.
 *
 * - provideEducationalFeedback - Une fonction qui fournit un feedback pour les réponses incorrectes aux quiz.
 * - ProvideEducationalFeedbackInput - Le type d'entrée pour la fonction provideEducationalFeedback.
 * - ProvideEducationalFeedbackOutput - Le type de retour pour la fonction provideEducationalFeedback.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProvideEducationalFeedbackInputSchema = z.object({
  question: z.string().describe('La question du quiz (en français).'),
  userAnswer: z.string().describe('La réponse de l\'utilisateur à la question (en français).'),
  correctAnswer: z.string().describe('La réponse correcte à la question (en français).'),
  context: z.string().describe('Contexte pertinent pour aider à expliquer la réponse et suggérer une étude. Peut être en anglais ou en français.'),
});

export type ProvideEducationalFeedbackInput = z.infer<typeof ProvideEducationalFeedbackInputSchema>;

const ProvideEducationalFeedbackOutputSchema = z.object({
  explanation: z.string().describe('Une explication claire et éducative, EN FRANÇAIS, indiquant pourquoi la réponse de l\'utilisateur était incorrecte et pourquoi la bonne réponse est correcte.'),
  studySuggestion: z.string().describe('Une suggestion concise EN FRANÇAIS sur le concept clé ou la section thématique que l\'utilisateur devrait réviser pour mieux comprendre cette question. Cette suggestion doit aider l\'utilisateur à identifier "la partie à étudier".'),
});

export type ProvideEducationalFeedbackOutput = z.infer<typeof ProvideEducationalFeedbackOutputSchema>;

export async function provideEducationalFeedback(input: ProvideEducationalFeedbackInput): Promise<ProvideEducationalFeedbackOutput> {
  return provideEducationalFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'provideEducationalFeedbackPrompt',
  input: {schema: ProvideEducationalFeedbackInputSchema},
  output: {schema: ProvideEducationalFeedbackOutputSchema},
  prompt: `Vous êtes un expert pédagogue fournissant des retours sur les questions d'un quiz.
La langue de l'interaction (question, réponses) est le FRANÇAIS. Votre explication et suggestion d'étude doivent impérativement être EN FRANÇAIS.

Un utilisateur a répondu incorrectement à la question suivante.
1. Fournissez une explication claire et pédagogique EN FRANÇAIS expliquant pourquoi la réponse de l'utilisateur était incorrecte et pourquoi la bonne réponse est correcte.
2. Fournissez une suggestion concise EN FRANÇAIS sur le concept clé ou la section thématique que l'utilisateur devrait réviser pour mieux comprendre cette question. Cette suggestion doit aider l'utilisateur à identifier "la partie à étudier".

Utilisez le contexte fourni pour informer votre réponse.

Question (en français) : {{{question}}}
Réponse de l'utilisateur (en français) : {{{userAnswer}}}
Réponse Correcte (en français) : {{{correctAnswer}}}
Contexte (peut être en anglais ou en français, utilisez-le pour informer votre réponse en français) : {{{context}}}`,
});

const provideEducationalFeedbackFlow = ai.defineFlow(
  {
    name: 'provideEducationalFeedbackFlow',
    inputSchema: ProvideEducationalFeedbackInputSchema,
    outputSchema: ProvideEducationalFeedbackOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("L'IA n'a pas pu générer de feedback.");
    }
    // S'assurer que les deux champs sont présents, même s'ils sont vides, pour respecter le schéma.
    return {
        explanation: output.explanation || "Explication non disponible.",
        studySuggestion: output.studySuggestion || "Suggestion d'étude non disponible."
    };
  }
);

