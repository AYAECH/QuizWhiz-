
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
  options: z.array(z.string()).optional(), // Options array can be of any length or missing here
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
    *   Générez environ {{{numQuestions}}} questions de quiz à choix multiples, EN FRANÇAIS, **strictement basées sur le contenu des documents PDF fournis**.
    *   **CRUCIAL : Chaque objet question dans le tableau 'quiz' DOIT impérativement contenir les trois champs suivants : 'question' (une chaîne de caractères non vide), 'options' (un tableau de EXACTEMENT 4 chaînes de caractères non vides et distinctes), et 'answer' (une chaîne de caractères non vide, qui doit être l'une des 4 options). Ne pas omettre AUCUN de ces champs pour AUCUNE question. Assurez-vous que le JSON est valide et complet pour chaque question.**
    *   **Absolument crucial :** Si vous ne pouvez pas générer de questions qui respectent **toutes** ces règles (par exemple, si le document est vide, illisible, ou ne contient pas assez d'informations pour le nombre de questions demandé), vous DEVEZ retourner "{\"quiz\": []}" (un tableau vide pour la clé 'quiz') dans l'objet JSON. NE PAS omettre la clé 'quiz'. NE PAS retourner d'objets question incomplets ou mal formés. Autrement, si des questions sont générées, assurez-vous que chaque objet question respecte la structure {question: string, options: string[4], answer: string}.
    *   **IMPORTANT : À chaque fois que ce prompt est appelé, même si les documents PDF d'entrée sont identiques, vous devez vous efforcer de générer un ENSEMBLE DE QUESTIONS DISTINCT ET ORIGINAL. Variez la formulation des questions, les sujets abordés (tout en restant fidèle au contenu du PDF), et les options de réponse (distracteurs). Ne répétez pas les questions générées lors d'appels précédents.**
    *   Chaque question doit avoir EXACTEMENT 4 options de réponse distinctes et plausibles, EN FRANÇAIS. Toutes les options doivent être des chaînes de caractères non vides.
    *   Une seule option peut être la bonne réponse.
    *   Assurez-vous que les questions couvrent un éventail large et diversifié de sujets issus des documents. Évitez de vous concentrer sur une seule section ou de répéter excessivement des concepts.
    *   Les questions elles-mêmes doivent être distinctes les unes des autres au sein du même quiz.
    *   Formulez les questions clairement et sans ambiguïté, EN FRANÇAIS.
    *   La réponse correcte doit être directement et clairement vérifiable à partir du contenu du document fourni et être l'une des 4 options proposées.

2.  **Génération d'Informations Flash (champ 'flashFacts') :**
    *   Produisez une LISTE (un tableau JavaScript de chaînes de caractères) de faits saillants, de points clés ou d'extraits intéressants et CONCIS issus de TOUS les documents fournis. Ces informations sont destinées à un apprentissage rapide ("flash").
    *   Chaque élément de la liste doit être une phrase courte, percutante, et non vide, EN FRANÇAIS.
    *   Le champ 'flashFacts' dans la sortie JSON doit être un tableau de chaînes de caractères. VISEZ À EXTRAIRE DES INFORMATIONS UTILES ET PERTINENTES.
    *   Si, après une analyse approfondie, aucun fait flash adapté, **non vide et pertinent** (différent de phrases génériques comme "Aucune information spécifique..." ou "Aucun fait flash adapté..."), ne peut être extrait, retournez **impérativement "[]"** (un tableau vide) pour 'flashFacts'. Autrement, si des faits sont générés, assurez-vous que 'flashFacts' est un tableau de chaînes.

Le format de sortie doit être JSON. L'intégralité du contenu textuel (questions, options, réponses, flashFacts) doit être EN FRANÇAIS.
ASSUREZ-VOUS QUE LA SORTIE GLOBALE EST UN OBJET JSON VALIDE CONTENANT LES CLÉS 'quiz' (un tableau d'objets question ou un tableau vide) ET 'flashFacts' (un tableau de chaînes de caractères ou un tableau vide). Il est acceptable de retourner un tableau vide pour 'quiz' si aucune question valide ne peut être formée, et/ou un tableau vide pour 'flashFacts' si aucun fait pertinent ne peut être extrait. L'important est que la structure JSON globale soit valide.

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
    const {output: lenientOutput} = await prompt(input); 

    if (!lenientOutput) {
        console.warn('[PDF_QUIZ_FLOW] La sortie brute de l\'IA (lenientOutput) est null ou undefined. L\'IA n\'a probablement pas pu parser la sortie ou a rencontré une erreur interne. Nombre de PDFS:', input.pdfDataUris.length);
        // Retourner une structure vide valide pour éviter des erreurs en aval
        return { quiz: [], flashFacts: undefined };
    }

    console.log('[PDF_QUIZ_FLOW] Raw AI output (lenient):', JSON.stringify(lenientOutput, null, 2));

    let validQuiz: QuizQuestion[] = [];
    if (lenientOutput.quiz && Array.isArray(lenientOutput.quiz)) {
      console.log(`[PDF_QUIZ_FLOW] L'IA a fourni ${lenientOutput.quiz.length} éléments de quiz avant filtrage.`);
      validQuiz = lenientOutput.quiz.filter(q =>
        q.question && typeof q.question === 'string' && q.question.trim() !== '' &&
        q.options && Array.isArray(q.options) && q.options.length === 4 &&
        q.options.every(opt => typeof opt === 'string' && opt.trim() !== '') &&
        q.answer && typeof q.answer === 'string' && q.answer.trim() !== '' &&
        q.options.includes(q.answer)
      ).map(q => ({
          question: q.question!,
          options: q.options as [string, string, string, string], // type assertion after validation
          answer: q.answer!
      }));
      console.log(`[PDF_QUIZ_FLOW] Après filtrage, ${validQuiz.length} éléments de quiz sont valides.`);

      if (validQuiz.length === 0 && lenientOutput.quiz.length > 0) {
        console.warn('[PDF_QUIZ_FLOW] Tous les éléments de quiz fournis par l\'IA ont été filtrés. Exemples d\'éléments invalides (les 2 premiers):');
        lenientOutput.quiz.slice(0, 2).forEach((invalidItem, idx) => {
          console.warn(`[PDF_QUIZ_FLOW] Élément invalide ${idx + 1}:`, JSON.stringify(invalidItem, null, 2));
        });
      }
    } else {
        if (lenientOutput.hasOwnProperty('quiz') && !Array.isArray(lenientOutput.quiz)) {
            console.warn("[PDF_QUIZ_FLOW] L'IA a retourné un champ 'quiz', mais ce n'était pas un tableau:", JSON.stringify(lenientOutput.quiz, null, 2));
        } else if (!lenientOutput.hasOwnProperty('quiz')) {
            console.warn("[PDF_QUIZ_FLOW] L'IA n'a pas retourné de champ 'quiz' dans sa sortie.");
        }
         // validQuiz reste []
    }


    let finalFlashFacts: string[] | undefined = undefined;
    if (lenientOutput.flashFacts && Array.isArray(lenientOutput.flashFacts)) {
        console.log(`[PDF_QUIZ_FLOW] L'IA a fourni ${lenientOutput.flashFacts.length} informations flash avant filtrage.`);
        const filteredFlashFacts = lenientOutput.flashFacts.filter(fact => typeof fact === 'string' && fact.trim() !== "" && !fact.toLowerCase().includes("aucune information flash spécifique") && !fact.toLowerCase().includes("aucun fait flash adapté"));
        
        if (filteredFlashFacts.length > 0) {
            finalFlashFacts = filteredFlashFacts;
        } else {
             console.warn('[PDF_QUIZ_FLOW] Les informations flash générées par l\'IA étaient vides ou non significatives après filtrage.');
        }
        console.log(`[PDF_QUIZ_FLOW] Après filtrage, ${finalFlashFacts?.length || 0} informations flash sont valides.`);

        if ((!finalFlashFacts || finalFlashFacts.length === 0) && lenientOutput.flashFacts.length > 0) {
             console.warn('[PDF_QUIZ_FLOW] Toutes les informations flash fournies par l\'IA ont été filtrées. Exemples d\'éléments invalides (les 2 premiers):');
            lenientOutput.flashFacts.slice(0, 2).forEach((invalidItem, idx) => {
                console.warn(`[PDF_QUIZ_FLOW] Élément d'information flash invalide ${idx + 1}:`, JSON.stringify(invalidItem, null, 2));
            });
        }
    } else {
        if (lenientOutput.hasOwnProperty('flashFacts') && !Array.isArray(lenientOutput.flashFacts)){
            console.warn("[PDF_QUIZ_FLOW] L'IA a retourné un champ 'flashFacts', mais ce n'était pas un tableau:", JSON.stringify(lenientOutput.flashFacts, null, 2));
        } else if (!lenientOutput.hasOwnProperty('flashFacts')) {
            console.warn("[PDF_QUIZ_FLOW] L'IA n'a pas retourné de champ 'flashFacts' dans sa sortie, ou il était vide.");
        }
        // finalFlashFacts reste undefined
    }


    if (validQuiz.length === 0 && (!finalFlashFacts || finalFlashFacts.length === 0)) {
      // Pas d'erreur levée ici, mais un log pour indiquer que rien d'utilisable n'a été produit.
      console.warn("[PDF_QUIZ_FLOW] L'IA n'a pas réussi à générer de contenu significatif (ni quiz valides, ni informations flash pertinentes) après filtrage. Le flux retournera des tableaux vides/undefined. Nombre de PDFs traités: " + input.pdfDataUris.length);
    } else if (validQuiz.length === 0 && finalFlashFacts && finalFlashFacts.length > 0) {
      console.warn("[PDF_QUIZ_FLOW] Aucune question de quiz valide n'a été générée à partir du PDF, mais des informations flash ont été extraites. Nombre de PDFs traités: " + input.pdfDataUris.length);
    } else if (validQuiz.length > 0 && validQuiz.length < input.numQuestions * 0.5) { // Si moins de 50% des questions demandées sont valides
      console.warn(`[PDF_QUIZ_FLOW] L'IA a généré seulement ${validQuiz.length} questions valides sur les ${input.numQuestions} demandées à partir du PDF. Nombre de PDFs traités: ${input.pdfDataUris.length}. Cela peut indiquer un problème avec le contenu du PDF ou la capacité de l'IA à le structurer.`);
    }

    if (validQuiz.length > 0 && (!finalFlashFacts || finalFlashFacts.length === 0)) {
        console.warn("[PDF_QUIZ_FLOW] Des questions de quiz valides ont été générées à partir du PDF, mais pas d'informations flash significatives. Nombre de PDFs traités: " + input.pdfDataUris.length);
    }

    return {
      quiz: validQuiz,
      flashFacts: finalFlashFacts,
    };
  }
);

    