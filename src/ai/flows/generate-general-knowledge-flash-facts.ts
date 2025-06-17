
'use server';
/**
 * @fileOverview Génère des informations flash de culture générale en français.
 *
 * - generateGeneralKnowledgeFlashFacts - Une fonction qui gère la génération d'informations flash.
 * - GeneralKnowledgeFlashFactsInput - Le type d'entrée pour la fonction.
 * - GeneralKnowledgeFlashFactsOutput - Le type de retour pour la fonction.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneralKnowledgeFlashFactsInputSchema = z.object({
  topic: z.string().describe('Le sujet de culture générale pour les informations flash, en français.'),
});
export type GeneralKnowledgeFlashFactsInput = z.infer<typeof GeneralKnowledgeFlashFactsInputSchema>;

const GeneralKnowledgeFlashFactsOutputSchema = z.object({
  flashFacts: z.array(z.string()).describe('Une liste de phrases concises et percutantes sur le sujet, en français.'),
});
export type GeneralKnowledgeFlashFactsOutput = z.infer<typeof GeneralKnowledgeFlashFactsOutputSchema>;

export async function generateGeneralKnowledgeFlashFacts(input: GeneralKnowledgeFlashFactsInput): Promise<GeneralKnowledgeFlashFactsOutput> {
  return generalKnowledgeFlashFactsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generalKnowledgeFlashFactsPrompt',
  input: {schema: GeneralKnowledgeFlashFactsInputSchema},
  output: {schema: GeneralKnowledgeFlashFactsOutputSchema},
  prompt: `Vous êtes un expert en création de contenu éducatif concis et pertinent EN FRANÇAIS.
Votre tâche est de générer une liste d'informations flash (faits saillants, points clés, phrases percutantes) sur le sujet de culture générale suivant : {{{topic}}}.
Produisez environ 3 à 5 informations flash. Chaque information doit être une phrase distincte, claire et informative.
Si le sujet a une connotation marocaine explicite (par exemple, "Actualité Marocaine", "Finance du Maroc", "ANCFCC", "Agriculture Maroc", "Économie Maroc"), concentrez impérativement les informations sur le contexte marocain. Pour des sujets plus généraux comme "Football", maintenez une perspective de culture générale large tout en incluant, si possible, un fait pertinent pour le Maroc si cela semble naturel.
L'intégralité du contenu généré DOIT être EN FRANÇAIS.
Le format de sortie doit être JSON avec un champ 'flashFacts' contenant un tableau de chaînes de caractères.`,
});

const generalKnowledgeFlashFactsFlow = ai.defineFlow(
  {
    name: 'generalKnowledgeFlashFactsFlow',
    inputSchema: GeneralKnowledgeFlashFactsInputSchema,
    outputSchema: GeneralKnowledgeFlashFactsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
     if (!output || !output.flashFacts || output.flashFacts.length === 0) {
      console.warn(`L'IA n'a pas généré d'informations flash pour le sujet : ${input.topic}`);
      // Retourner un tableau vide au lieu de lever une erreur permet à l'interface utilisateur de gérer l'absence d'infos.
      return { flashFacts: [] };
    }
    return output!;
  }
);
