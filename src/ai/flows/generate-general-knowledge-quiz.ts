
'use server';
/**
 * @fileOverview Génère un quiz de culture générale en français.
 *
 * - generateGeneralKnowledgeQuiz - Une fonction qui gère la génération de quiz.
 * - GeneralKnowledgeQuizInput - Le type d'entrée pour la fonction.
 * - GeneralKnowledgeQuizOutput - Le type de retour pour la fonction.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneralKnowledgeQuizInputSchema = z.object({
  topic: z.string().describe('Le sujet de culture générale pour le quiz, en français.'),
  numQuestions: z.number().int().min(5).max(50).describe('Le nombre souhaité de questions pour le quiz (entre 5 et 50).'),
});
export type GeneralKnowledgeQuizInput = z.infer<typeof GeneralKnowledgeQuizInputSchema>;

const GeneralKnowledgeQuizOutputSchema = z.object({
  quiz: z.array(
    z.object({
      question: z.string().describe('La question du quiz, en français.'),
      options: z.array(z.string()).describe('Les options à choix multiples pour la question, en français.'),
      answer: z.string().describe('La réponse correcte à la question, en français.'),
    })
  ).describe('Les questions et réponses du quiz générées, en français.'),
   flashFacts: z.array(z.string()).optional().describe('Optionnel : Quelques informations flash concises relatives au sujet du quiz, en français.'),
});
export type GeneralKnowledgeQuizOutput = z.infer<typeof GeneralKnowledgeQuizOutputSchema>;

export async function generateGeneralKnowledgeQuiz(input: GeneralKnowledgeQuizInput): Promise<GeneralKnowledgeQuizOutput> {
  if (input.numQuestions < 5 || input.numQuestions > 50) {
    throw new Error('Le nombre de questions doit être compris entre 5 et 50.');
  }
  return generalKnowledgeQuizFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generalKnowledgeQuizPrompt',
  input: {schema: GeneralKnowledgeQuizInputSchema},
  output: {schema: GeneralKnowledgeQuizOutputSchema},
  prompt: `Vous êtes un expert en création de contenu éducatif et de quiz EN FRANÇAIS.
Votre tâche est de générer un quiz à choix multiples sur le sujet de culture générale suivant : {{{topic}}}.
Générez exactement {{{numQuestions}}} questions.
Chaque question doit avoir 4 options de réponse distinctes et plausibles.
Une seule option doit être la bonne réponse.
Assurez-vous que les questions soient claires, bien formulées, originales et pertinentes pour le sujet donné. Évitez les questions trop triviales ou trop obscures.
Si le sujet a une connotation marocaine explicite (par exemple, "Actualité Marocaine", "Finance du Maroc", "ANCFCC", "Agriculture Maroc", "Économie Maroc"), concentrez impérativement les questions et les réponses sur le contexte marocain. Pour des sujets plus généraux comme "Football", maintenez une perspective de culture générale large, mais n'hésitez pas à inclure des questions relatives au football marocain si cela diversifie le quiz.
L'intégralité du contenu (questions, options, réponses) doit être EN FRANÇAIS.
Optionnel : Vous pouvez également générer 2-3 "flashFacts" (faits saillants concis et intéressants) en français relatifs au sujet {{{topic}}}. Ces flashFacts ne doivent pas répéter les questions/réponses du quiz.`,
});

const generalKnowledgeQuizFlow = ai.defineFlow(
  {
    name: 'generalKnowledgeQuizFlow',
    inputSchema: GeneralKnowledgeQuizInputSchema,
    outputSchema: GeneralKnowledgeQuizOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output || !output.quiz || output.quiz.length === 0) {
      throw new Error("L'IA n'a pas réussi à générer des questions de quiz pour le sujet demandé.");
    }
     if (!output.flashFacts || output.flashFacts.length === 0) {
        // Ne pas lever d'erreur si les flashfacts sont absents, car ils sont optionnels.
        console.warn(`L'IA n'a pas généré d'informations flash optionnelles pour le quiz sur : ${input.topic}`);
        output.flashFacts = undefined; // S'assurer qu'il est undefined si vide
    }
    return output!;
  }
);
