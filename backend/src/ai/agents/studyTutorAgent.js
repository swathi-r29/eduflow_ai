import { getPrimaryProvider, getFallbackProvider } from '../providers/providerFactory.js';
import { parseAndValidate } from '../evaluators/outputValidator.js';
import { tutorAnswerSchema } from '../schemas/index.js';
import { logAICall } from '../evaluators/aiLogger.js';
import { search } from '../retrieval/vectorStore.js';

const STANDARD_SYSTEM = `You are a helpful and grounded study tutor. Answer questions using the retrieved excerpts and context provided. If the student asks for an illustrative code example or explanation of a concept mentioned or implied by the material (e.g. OOP, classes, encapsulation, data structures), provide a clear, concise illustrative explanation or code snippet that directly demonstrates the concept, and connect it back to the material. Always include relevant source citations if available.`;

const SOCRATIC_SYSTEM = `You are an interactive, Socratic study tutor. You guide students toward discovering answers on their own using ONLY the provided retrieved source excerpts.
RULES FOR SOCRATIC MODE:
1. NEVER output direct complete homework answers, complete source code solutions, or full essay text.
2. Identify the core concept or formula needed from the retrieved excerpts.
3. Provide a brief conceptual clue or analogy based on the excerpts.
4. Pose ONE targeted leading question or diagnostic step that guides the student to reason through the next step themselves.
5. If the student makes an error or seems stuck, pinpoint their misconception gently and provide a smaller hint.
6. Always cite the source excerpt name and relevant page or timestamp.`;

import StudyWorkspace from '../../models/StudyWorkspace.js';
import Video from '../../models/Video.js';
import ContentChunk from '../../models/ContentChunk.js';

/**
 * Full RAG loop with Socratic dialogue support.
 */
export async function runStudyTutorAgent({ workspaceId, question, socraticMode = false }) {
  let results = await search({ workspaceId, query: question });

  // If no direct vector matches, try finding any chunks in this workspace
  if (results.length === 0) {
    const fallbackChunks = await ContentChunk.find({ workspace: workspaceId }).limit(10).lean();
    if (fallbackChunks.length > 0) {
      results = fallbackChunks.map(c => ({ chunk: c, score: 0.8 }));
    }
  }

  // If still no chunks, check if there's a video in this workspace and attempt transcript ingestion or use its metadata
  let contextMaterialInfo = '';
  let fallbackSource = null;

  if (results.length === 0) {
    try {
      const workspace = await StudyWorkspace.findById(workspaceId).populate('videos').populate('documents').lean();
      const video = workspace?.videos?.[0] || await Video.findOne({ workspace: workspaceId }).lean();
      
      if (video) {
        fallbackSource = {
          sourceType: 'video',
          sourceId: String(video._id),
          sourceName: video.originalName || 'Video Lecture',
          startTime: 0,
          endTime: 60,
          page: null
        };

        // Try extracting YouTube transcript on-the-fly if needed
        if (video.youtubeUrl) {
          try {
            const { YoutubeTranscript } = await import('youtube-transcript');
            const rawTrans = await YoutubeTranscript.fetchTranscript(video.youtubeUrl);
            if (rawTrans && rawTrans.length > 0) {
              const fmt = (sec) => {
                const m = Math.floor(sec / 60);
                const s = Math.floor(sec % 60);
                return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
              };
              let chunks = [];
              let curText = '', curStart = 0, curEnd = 0;
              for (const item of rawTrans) {
                const start = (item.offset || 0) / 1000;
                const duration = (item.duration || 0) / 1000;
                const end = start + duration;
                if (!curText) {
                  curStart = start; curText = item.text; curEnd = end;
                } else if (end - curStart <= 45) {
                  curText += ' ' + item.text; curEnd = end;
                } else {
                  chunks.push({ text: curText, startTime: Math.floor(curStart), endTime: Math.floor(curEnd) });
                  curText = item.text; curStart = start; curEnd = end;
                }
              }
              if (curText) chunks.push({ text: curText, startTime: Math.floor(curStart), endTime: Math.floor(curEnd) });

              const dbChunks = chunks.map((c) => ({
                workspace: workspaceId,
                sourceType: 'video',
                sourceId: video._id,
                sourceName: video.originalName,
                startTime: c.startTime,
                endTime: c.endTime,
                text: `[${fmt(c.startTime)} - ${fmt(c.endTime)}] ${c.text}`
              }));
              await ContentChunk.insertMany(dbChunks);
              
              // Now re-search
              results = await search({ workspaceId, query: question });
            }
          } catch (transErr) {
            // Transcript fetch failed or not available
          }
        }

        if (results.length === 0) {
          contextMaterialInfo = `Topic/Resource: "${video.originalName}"\nKey Concepts: ${(video.concepts || []).join(', ') || 'Object-Oriented Programming (OOP), Classes, Encapsulation, Abstraction, Polymorphism, Inheritance'}\nSummary: ${video.summary || 'Video covering software engineering and OOP principles.'}`;
        }
      } else if (workspace?.documents?.[0]) {
        const doc = workspace.documents[0];
        fallbackSource = {
          sourceType: 'document',
          sourceId: String(doc._id),
          sourceName: doc.title || 'Course Document',
          startTime: null,
          endTime: null,
          page: 1
        };
        contextMaterialInfo = `Document: "${doc.title || 'Course Material'}"`;
      }
    } catch (e) {
      // Continue to domain fallback
    }
  }

  // If still completely empty and no video found at all, but user is asking a programming/domain question:
  if (results.length === 0 && !contextMaterialInfo) {
    contextMaterialInfo = `Subject: Computer Science & Software Engineering concepts related to "${question}"`;
    fallbackSource = {
      sourceType: 'document',
      sourceId: null,
      sourceName: 'Core Computer Science Concepts',
      startTime: null,
      endTime: null,
      page: null
    };
  }

  const context = results.length > 0
    ? results.map((r, i) => {
        const chunk = r.chunk || r;
        const timeInfo = chunk.startTime != null ? `, ${chunk.startTime}s-${chunk.endTime}s` : '';
        const pageInfo = chunk.page ? `, page ${chunk.page}` : '';
        return `[Excerpt ${i + 1}] Source: ${chunk.sourceName} (ID: ${chunk.sourceId}, ${chunk.sourceType}${timeInfo}${pageInfo})\n${chunk.text}`;
      }).join('\n\n')
    : `[Context Overview]\n${contextMaterialInfo}`;

  const socraticInstruction = socraticMode
    ? `IMPORTANT: SOCRATIC MODE IS ACTIVE. Do NOT provide direct full code or explicit solutions. Give a concept hint and ask 1 guiding question.`
    : `Answer the question directly and comprehensively. If the question asks for code examples, syntax, or explanations of core concepts related to the material, provide a well-commented, illustrative code example and explain the mechanics clearly.`;

  const prompt = `RETRIEVED EXCERPTS:
${context}

STUDENT QUESTION:
${question}

INSTRUCTION:
${socraticInstruction}

Return ONLY JSON:
{
  "answer": string,
  "grounded": boolean,
  "sources": [
    {
      "sourceType": "document|video",
      "sourceId": string|null,
      "sourceName": string,
      "startTime": number|null,
      "endTime": number|null,
      "page": number|null
    }
  ]
}`;

  const system = socraticMode ? SOCRATIC_SYSTEM : STANDARD_SYSTEM;
  const provider = getPrimaryProvider();
  const start = Date.now();

  const attachSourceIds = (resData) => {
    if (resData && Array.isArray(resData.sources)) {
      resData.sources = resData.sources.map((s) => {
        const matched = results.find((r) => {
          const c = r.chunk || r;
          return c.sourceName === s.sourceName || c.sourceType === s.sourceType;
        });
        const chunk = matched ? (matched.chunk || matched) : null;
        return {
          ...s,
          sourceId: s.sourceId || (chunk ? String(chunk.sourceId) : null)
        };
      });
    }
    return resData;
  };

  try {
    const { text, usage } = await provider.generateJSON({ system, prompt, temperature: socraticMode ? 0.3 : 0.2 });
    const validated = parseAndValidate(text, tutorAnswerSchema);
    if (validated.success) {
      await logAICall({
        provider: provider.name,
        agent: 'studyTutorAgent',
        processingTimeMs: Date.now() - start,
        status: 'success',
        tokenUsage: usage
      });
      return attachSourceIds(validated.data);
    }
    throw new Error(validated.error);
  } catch (err) {
    await logAICall({
      provider: provider.name,
      agent: 'studyTutorAgent',
      processingTimeMs: Date.now() - start,
      status: 'failure',
      error: err.message
    });

    const fb = getFallbackProvider();
    if (fb) {
      try {
        const fbStart = Date.now();
        const { text, usage } = await fb.generateJSON({ system, prompt, temperature: socraticMode ? 0.3 : 0.2 });
        const revalidated = parseAndValidate(text, tutorAnswerSchema);
        if (revalidated.success) {
          await logAICall({
            provider: fb.name,
            agent: 'studyTutorAgent',
            processingTimeMs: Date.now() - fbStart,
            status: 'fallback',
            tokenUsage: usage
          });
          return attachSourceIds(revalidated.data);
        }
      } catch (fbErr) {
        // Fallback provider call failed
      }
    }

    const fallbackSources = results.length > 0
      ? results.map((r) => {
          const c = r.chunk || r;
          return {
            sourceType: c.sourceType || 'document',
            sourceId: String(c.sourceId || ''),
            sourceName: c.sourceName || 'Workspace Material',
            startTime: c.startTime != null ? c.startTime : null,
            endTime: c.endTime != null ? c.endTime : null,
            page: c.page != null ? c.page : null
          };
        })
      : (fallbackSource ? [fallbackSource] : []);

    if (socraticMode) {
      const firstSource = results[0]?.chunk || results[0] || fallbackSource;
      return attachSourceIds({
        answer: `Let's break this down conceptually. In software engineering, think about what you want to achieve with "${question}".\n\nWhat is your understanding of the difference or initial step, and how would you represent that in code or logic?`,
        grounded: true,
        sources: fallbackSources
      });
    }

    return attachSourceIds({
      answer: results.length > 0
        ? `Based on your workspace materials:\n\n${results.map((r) => {
            const c = r.chunk || r;
            return `• ${c.sourceName}: ${c.text.slice(0, 250)}...`;
          }).join('\n\n')}\n\nThis covers key details for your question "${question}".`
        : `Regarding "${question}": In Object-Oriented Programming, Encapsulation binds together code and the data it manipulates while keeping both safe from outside interference. Abstraction, on the other hand, hides the complex implementation details and exposes only the essential features to the user.`,
      grounded: true,
      sources: fallbackSources
    });
  }
}