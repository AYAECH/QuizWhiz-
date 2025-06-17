
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
import type { QuizQuestion } from '@/types';

const GenerateQuizFromPdfInputSchema = z.object({
  pdfDataUris: z.array(z
    .string()
    .describe(
      "Un document PDF, sous forme d'URI de données qui doit inclure un type MIME et utiliser l'encodage Base64. Format attendu : 'data:<mimetype>;base64,<encoded_data>'."
    )).describe('Un tableau de documents PDF sous forme d\'URI de données.'),
  numQuestions: z.number().int().min(5).max(2000).describe("Le nombre de questions souhaité à générer, entre 5 et 2000."),
});
export type GenerateQuizFromPdfInput = z.infer<typeof GenerateQuizFromPdfInputSchema>;

// Strict schema for the flow's final output
const GenerateQuizFromPdfOutputSchema = z.object({
  quiz: z.array(
    z.object({
      question: z.string().describe('La question du quiz, en français.'),
      options: z.array(z.string()).length(4).describe('Les 4 options à choix multiples pour la question, en français.'),
      answer: z.string().describe('La réponse correcte à la question, en français.'),
    })
  ).describe('Les questions et réponses du quiz générées, en français.'),
  flashFacts: z.array(z.string()).optional().describe('Une liste de phrases concises ou de faits intéressants extraits des documents PDF, en français, adaptés à un apprentissage rapide. Chaque élément du tableau doit être une phrase distincte.'),
});
export type GenerateQuizFromPdfOutput = z.infer<typeof GenerateQuizFromPdfOutputSchema>;


// Lenient schemas for parsing the AI's direct output
const LenientQuizQuestionSchema = z.object({
  question: z.string().optional(),
  options: z.array(z.string()).optional(),
  answer: z.string().optional(),
});
const LenientGenerateQuizFromPdfOutputSchema = z.object({
  quiz: z.array(LenientQuizQuestionSchema).optional(),
  flashFacts: z.array(z.string()).optional(),
});


export async function generateQuizFromPdf(input: GenerateQuizFromPdfInput): Promise<GenerateQuizFromPdfOutput> {
  if (!input.pdfDataUris || input.pdfDataUris.length === 0) {
    throw new Error('Aucun document PDF fourni.');
  }
  if (input.numQuestions < 5 || input.numQuestions > 2000) {
    throw new Error('Le nombre de questions doit être compris entre 5 et 2000.');
  }
  return generateQuizFromPdfFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizFromPdfPrompt',
  input: {schema: GenerateQuizFromPdfInputSchema},
  output: {schema: LenientGenerateQuizFromPdfOutputSchema}, // Use lenient schema for AI output
  prompt: `Vous êtes un expert en génération de contenu éducatif en français. Votre tâche est d'analyser méticuleusement le contenu de TOUS les documents PDF fournis.
En fonction de cette analyse, vous produirez une sortie JSON avec deux champs principaux : 'quiz' et 'flashFacts'. Tout le contenu textuel généré DOIT être en FRANÇAIS.

1.  **Génération de Quiz (champ 'quiz') :**
    *   Générez environ {{{numQuestions}}} questions de quiz à choix multiples, EN FRANÇAIS. Essayez de vous approcher de ce nombre.
    *   **IMPORTANT : Chaque objet question dans le tableau 'quiz' DOIT impérativement contenir les trois champs suivants : 'question' (une chaîne de caractères non vide), 'options' (un tableau de EXACTEMENT 4 chaînes de caractères non vides), et 'answer' (une chaîne de caractères non vide, qui doit être l'une des 4 options). Ne pas omettre AUCUN de ces champs pour AUCUNE question. Assurez-vous que le JSON est valide et complet pour chaque question.**
    *   Il est crucial que chaque quiz que vous générez soit significativement différent de tout quiz précédent, même s'il est basé sur les mêmes documents. Visez l'originalité dans la formulation des questions, la sélection des sujets et la construction des distracteurs (options incorrectes). Assurez-vous que les questions ne sont pas trop similaires entre elles au sein d'un même quiz.
    *   Chaque question doit avoir EXACTEMENT 4 options de réponse distinctes et plausibles, EN FRANÇAIS. Toutes les options doivent être des chaînes de caractères non vides.
    *   Une seule option peut être la bonne réponse.
    *   Assurez-vous que les questions couvrent un éventail large et diversifié de sujets issus des documents. Évitez de vous concentrer sur une seule section ou de répéter excessivement des concepts.
    *   Les questions elles-mêmes doivent être distinctes les unes des autres au sein du même quiz.
    *   Formulez les questions clairement et sans ambiguïté, EN FRANÇAIS.
    *   La réponse correcte doit être directement et clairement vérifiable à partir du contenu du document fourni et être l'une des 4 options proposées.

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
    outputSchema: GenerateQuizFromPdfOutputSchema, // Flow declares the strict output schema
  },
  async (input): Promise<GenerateQuizFromPdfOutput> => {
    const {output: lenientOutput} = await prompt(input); // Genkit performs schema validation here

    if (!lenientOutput || !lenientOutput.quiz) {
      throw new Error('L\'IA n\'a pas généré de questions de quiz ou a retourné une structure de quiz invalide.');
    }

    const validQuiz: QuizQuestion[] = lenientOutput.quiz.filter(q =>
      q.question && typeof q.question === 'string' && q.question.trim() !== '' &&
      q.options && Array.isArray(q.options) && q.options.length === 4 &&
      q.options.every(opt => typeof opt === 'string' && opt.trim() !== '') &&
      q.answer && typeof q.answer === 'string' && q.answer.trim() !== '' &&
      q.options.includes(q.answer) // Ensure the answer is one of the options
    ).map(q => ({ // Map to the strict QuizQuestion structure, ensuring properties are non-null
        question: q.question!,
        options: q.options as [string, string, string, string], // Type assertion after length check
        answer: q.answer!
    }));

    if (validQuiz.length === 0) {
        console.warn('Données brutes de l\'IA pour le quiz:', JSON.stringify(lenientOutput.quiz, null, 2));
        throw new Error("L'IA n'a pas généré de questions de quiz valides après filtrage. Vérifiez les logs pour les données brutes.");
    }
    
    if (validQuiz.length < input.numQuestions * 0.8) { // If less than 80% of requested questions are valid
        console.warn(`L'IA n'a généré que ${validQuiz.length} questions valides sur les ${input.numQuestions} demandées. Certaines questions ont pu être filtrées en raison d'une structure incorrecte. Cela peut indiquer un problème avec le contenu du PDF ou la capacité de l'IA à le structurer.`);
    }
    
    let finalFlashFacts = lenientOutput.flashFacts;
    if (!finalFlashFacts || finalFlashFacts.length === 0 || finalFlashFacts.every(fact => fact.trim() === "" || fact.toLowerCase().includes("aucune information flash spécifique"))) {
        console.warn('L\'IA n\'a pas généré d\'informations flash significatives.');
        finalFlashFacts = undefined; 
    }

    return {
        quiz: validQuiz,
        flashFacts: finalFlashFacts
    };
  }
);
