
'use server';
/**
 * @fileOverview Génère un quiz à choix multiples et des informations flash en français à partir d'un ou plusieurs documents PDF.
 *
 * - generateQuizFromPdf - Une fonction qui gère le processus de génération de quiz et d'informations flash.
 * - GenerateQuizFromPdfInput - Le type d'entrée pour la fonction generateQuizFromPdf.
 * - GenerateQuizFromPdfOutput - Le type de retour pour la fonction generateQuizFromPdf.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizFromPdfInputSchema = z.object({
  pdfDataUris: z.array(z
    .string()
    .describe(
      "Un document PDF, sous forme d'URI de données qui doit inclure un type MIME et utiliser l'encodage Base64. Format attendu : 'data:<mimetype>;base64,<encoded_data>'."
    )).describe('Un tableau de documents PDF sous forme d\'URI de données.'),
  numQuestions: z.number().int().min(5).max(100).describe("Le nombre de questions souhaité à générer, entre 5 et 100."),
});
export type GenerateQuizFromPdfInput = z.infer<typeof GenerateQuizFromPdfInputSchema>;

const GenerateQuizFromPdfOutputSchema = z.object({
  quiz: z.array(
    z.object({
      question: z.string().describe('La question du quiz, en français.'),
      options: z.array(z.string()).describe('Les options à choix multiples pour la question, en français.'),
      answer: z.string().describe('La réponse correcte à la question, en français.'),
    })
  ).describe('Les questions et réponses du quiz générées, en français.'),
  flashFacts: z.array(z.string()).optional().describe('Une liste de phrases concises ou de faits intéressants extraits des documents PDF, en français, adaptés à un apprentissage rapide. Chaque élément du tableau doit être une phrase distincte.'),
});
export type GenerateQuizFromPdfOutput = z.infer<typeof GenerateQuizFromPdfOutputSchema>;

export async function generateQuizFromPdf(input: GenerateQuizFromPdfInput): Promise<GenerateQuizFromPdfOutput> {
  if (!input.pdfDataUris || input.pdfDataUris.length === 0) {
    throw new Error('Aucun document PDF fourni.');
  }
  if (input.numQuestions < 5 || input.numQuestions > 100) { // Updated max to 100
    throw new Error('Le nombre de questions doit être compris entre 5 et 100.');
  }
  return generateQuizFromPdfFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizFromPdfPrompt',
  input: {schema: GenerateQuizFromPdfInputSchema},
  output: {schema: GenerateQuizFromPdfOutputSchema},
  prompt: `Vous êtes un expert en génération de contenu éducatif en français. Votre tâche est d'analyser méticuleusement le contenu de TOUS les documents PDF fournis.
En fonction de cette analyse, vous produirez une sortie JSON avec deux champs principaux : 'quiz' et 'flashFacts'. Tout le contenu textuel généré DOIT être en FRANÇAIS.

1.  **Génération de Quiz (champ 'quiz') :**
    *   Générez exactement {{{numQuestions}}} questions de quiz à choix multiples, EN FRANÇAIS.
    *   **IMPORTANT : Chaque objet question dans le tableau 'quiz' DOIT impérativement contenir les trois champs suivants : 'question' (une chaîne de caractères), 'options' (un tableau de 4 chaînes de caractères), et 'answer' (une chaîne de caractères). Ne pas omettre AUCUN de ces champs pour AUCUNE question. Assurez-vous que le JSON est valide et complet pour chaque question.**
    *   Il est crucial que chaque quiz que vous générez soit significativement différent de tout quiz précédent, même s'il est basé sur les mêmes documents. Visez l'originalité dans la formulation des questions, la sélection des sujets et la construction des distracteurs (options incorrectes). Assurez-vous que les questions ne sont pas trop similaires entre elles au sein d'un même quiz.
    *   Chaque question doit avoir 4 options de réponse distinctes, EN FRANÇAIS.
    *   Une seule option peut être la bonne réponse.
    *   Assurez-vous que les questions couvrent un éventail large et diversifié de sujets issus des documents. Évitez de vous concentrer sur une seule section ou de répéter excessivement des concepts.
    *   Les questions elles-mêmes doivent être distinctes les unes des autres au sein du même quiz.
    *   Formulez les questions clairement et sans ambiguïté, EN FRANÇAIS.
    *   La réponse correcte doit être directement et clairement vérifiable à partir du contenu du document fourni.

2.  **Génération d'Informations Flash (champ 'flashFacts') :**
    *   Produisez une LISTE (un tableau JavaScript) de faits saillants, de points clés ou d'extraits intéressants et CONCIS issus de TOUS les documents fournis. Ces informations sont destinées à un apprentissage rapide ("flash").
    *   Chaque élément de la liste doit être une phrase courte et percutante, EN FRANÇAIS.
    *   Le champ 'flashFacts' dans la sortie JSON doit être un tableau de chaînes de caractères. VISEZ À EXTRAIRE DES INFORMATIONS UTILES ET PERTINENTES. Si, après une analyse approfondie, aucun fait flash adapté ne peut être extrait, vous pouvez retourner un tableau vide pour 'flashFacts', mais cela devrait être un dernier recours. Évitez les phrases génériques comme "Aucune information spécifique...".

Le format de sortie doit être JSON. L'intégralité du contenu textuel (questions, options, réponses, flashFacts) doit être EN FRANÇAIS.

{{#if pdfDataUris}}
Voici les documents PDF :
{{#each pdfDataUris}}
Contenu du Document :
{{media url=this}}
--- Fin du Contenu du Document ---
{{/each}}
{{else}}
Erreur : Aucun document PDF n'a été fourni en entrée. Impossible de générer du contenu.
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
    const {output} = await prompt(input); // Genkit performs schema validation here
    
    // These checks are mostly for cases where the AI might return an empty but valid structure,
    // or if the schema validation was somehow bypassed or output was manipulated before return.
    // The primary validation against the schema happens implicitly with `await prompt(input)`.
    if (!output || !output.quiz || output.quiz.length === 0) {
      throw new Error('L\'IA n\'a pas réussi à générer des questions de quiz ou a retourné un quiz vide.');
    }

    // Further check for individual question validity, though schema should catch most of this
    const validQuiz = output.quiz.filter(q => q.question && q.options && Array.isArray(q.options) && q.options.length > 0 && q.answer);
    if (validQuiz.length !== output.quiz.length) {
        console.warn(`Certaines questions générées par l'IA étaient incomplètes et ont été implicitement filtrées par la validation du schéma ou manquaient. Quiz initial: ${output.quiz.length}, Quiz après validation Zod implicite (ou si partiellement valide): ${validQuiz.length}`);
        // If the number of questions becomes 0 after this, it might indicate a more severe generation issue.
        if (validQuiz.length === 0) {
            throw new Error("L'IA n'a pas généré de questions de quiz valides après filtrage interne.");
        }
    }
    
    // This check is more about quantity than individual validity (which Zod handles)
    if (validQuiz.length < Math.max(1, input.numQuestions / 2)) { // Check against validQuiz.length
        console.warn(`L'IA n'a généré que ${validQuiz.length} questions valides, soit moins de la moitié des ${input.numQuestions} demandées.`);
    }

    // Ensure flashFacts handling remains
    let finalFlashFacts = output.flashFacts;
    if (!finalFlashFacts || finalFlashFacts.length === 0 || finalFlashFacts.every(fact => fact.trim() === "" || fact.toLowerCase().includes("aucune information flash spécifique"))) {
        console.warn('L\'IA n\'a pas généré d\'informations flash significatives.');
        finalFlashFacts = undefined; 
    }

    // Return a new object with the potentially filtered quiz and processed flashFacts
    return {
        quiz: validQuiz,
        flashFacts: finalFlashFacts
    };
  }
);

