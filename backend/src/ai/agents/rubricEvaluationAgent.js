import { runAgent } from '../orchestrator/runAgent.js';
import { rubricEvaluationSchema } from '../schemas/index.js';

const SYSTEM = `You are a rigorous, evidence-based code and theory evaluator. You evaluate student submissions against rubric criteria.
For EACH criterion in criteriaScores:
1. The "evidence" field MUST be a unique, specific, direct quote or snippet from the student's submission that specifically addresses that criterion. Do NOT repeat the exact same generic text across multiple criteria.
2. Provide a "confidence" float between 0.0 and 1.0 indicating your certainty in assessing that criterion.
3. Provide a brief "confidenceReason" describing why confidence is high or low.

At the top level:
- "overallConfidence": Compute a float between 0.0 and 1.0 (mean of criterion confidences, reduced if the submission is incomplete, contradictory, or borderline).
- "requiresTeacherReview": Boolean. Set to true if overallConfidence is less than 0.70, or if any criterion confidence is less than 0.70.
- "reviewReason": String explaining why teacher verification is required (or an empty string if confident).`;

export async function runRubricEvaluationAgent({
  question,
  rubric,
  maxScore = 100,
  submissionText,
  understanding,
  executionResults,
  evaluationType = 'PROGRAMMING',
  calibrationExamples = []
}) {
  const isTheory = evaluationType === 'THEORY' || evaluationType === 'ESSAY';

  const calibrationSection = Array.isArray(calibrationExamples) && calibrationExamples.length > 0
    ? `
TEACHER-GRADED GROUND TRUTH CALIBRATION (FEW-SHOT EXAMPLES):
Use these teacher-graded exemplars as direct guidance for scoring standards, grading leniency, and deduction style:
${JSON.stringify(calibrationExamples, null, 2)}
`
    : '';

  const prompt = `
ASSIGNMENT QUESTION:
${question}

ASSIGNMENT TYPE: ${evaluationType}

RUBRIC (criterion, maxPoints):
${JSON.stringify(rubric, null, 2)}

TOTAL MAX SCORE: ${maxScore}
${calibrationSection}
STUDENT SUBMISSION:
${submissionText}

PRIOR UNDERSTANDING ANALYSIS:
${JSON.stringify(understanding, null, 2)}

DETERMINISTIC EXECUTION RESULTS (${isTheory ? 'NOT APPLICABLE FOR THEORY ASSIGNMENT' : 'PRIMARY GROUND TRUTH FOR CORRECTNESS'}):
${JSON.stringify(executionResults || { status: 'none', tests: [] }, null, 2)}

RULES FOR GRADING:
1. ${isTheory ? 'Evaluate the theory response purely on conceptual accuracy, completeness, and clarity of examples.' : 'Use the Deterministic Execution Results as the primary source of truth for executable correctness.'}
2. ${isTheory ? 'If the submission explains concepts correctly and answers all parts of the question, award full points.' : 'If any test in execution results failed (e.g., failed boundary condition), do NOT award full credit for Logic & Correctness or Edge Case Handling.'}
3. CALIBRATION ALIGNMENT: If teacher-graded exemplars are provided above, align your scoring and feedback tone with the teacher's grading standard.
4. CRITICAL EVIDENCE REQUIREMENT: For EACH criterion in criteriaScores, the "evidence" field MUST be a distinct, unique quote or excerpt from the submission text that directly demonstrates THAT specific criterion.
5. CONFIDENCE AND REVIEW ROUTING:
   - Assign confidence (0.0 to 1.0) and confidenceReason to every criterion.
   - If evidence is vague, ambiguous, or only partially demonstrated, set confidence below 0.70.
   - Compute overallConfidence. If overallConfidence < 0.70 or any criterion confidence < 0.70, set requiresTeacherReview to true and detail the exact reason in reviewReason.

Return JSON matching this exact structure:
{
  "totalScore": number,
  "maxScore": ${maxScore},
  "overallConfidence": number,
  "requiresTeacherReview": boolean,
  "reviewReason": string,
  "criteriaScores": [
    {
      "criterion": string,
      "score": number,
      "maxPoints": number,
      "confidence": number,
      "confidenceReason": string,
      "reasoning": string,
      "evidence": string
    }
  ]
}`;

  let evaluation;
  try {
    evaluation = await runAgent({
      agentName: 'rubricEvaluationAgent',
      system: SYSTEM,
      prompt,
      schema: rubricEvaluationSchema,
      temperature: 0.1
    });
  } catch (err) {
    evaluation = getRuleBoundedRubricEvaluation({
      rubric,
      maxScore,
      executionResults,
      submissionText,
      isTheory
    });
  }

  return applyDeterministicScoreEnforcement({
    evaluation,
    rubric,
    maxScore,
    executionResults
  });
}

/**
 * Enforces strict deterministic caps on LLM rubric scores based on execution evidence,
 * normalizes confidence metrics, and flags teacher reviews on discrepancies.
 */
function applyDeterministicScoreEnforcement({ evaluation, rubric, maxScore, executionResults }) {
  const criteria = Array.isArray(evaluation?.criteriaScores) ? evaluation.criteriaScores : [];
  const hasExecution = executionResults && executionResults.applicable !== false && Array.isArray(executionResults.tests) && executionResults.tests.length > 0;
  const { totalTests = 0, passedTests = 0, failedTests = 0 } = executionResults || {};
  const passRatio = totalTests > 0 ? passedTests / totalTests : 1.0;
  const hasFailures = hasExecution && failedTests > 0;

  let totalScore = 0;
  const reviewReasons = [];

  const adjustedCriteria = criteria.map((c) => {
    let finalScore = Number(c.score) || 0;
    let confidence = typeof c.confidence === 'number' ? Math.max(0, Math.min(1, c.confidence)) : 0.9;
    let confidenceReason = c.confidenceReason || 'Standard criterion evaluation.';
    let reasoning = c.reasoning || '';
    let evidence = c.evidence || '';

    if (hasExecution) {
      const criterionName = (c.criterion || '').toLowerCase();
      const isSortingCriterion = criterionName.includes('sort') || criterionName.includes('order') || criterionName.includes('return type');
      const isLogicOrEdgeCriterion = criterionName.includes('logic') || criterionName.includes('correct') || criterionName.includes('filter') || criterionName.includes('edge');

      if (hasFailures && isLogicOrEdgeCriterion) {
        const ratioCap = Math.floor(c.maxPoints * Math.min(passRatio, 0.75));

        if (finalScore > ratioCap) {
          finalScore = ratioCap;
          confidence = Math.min(confidence, 0.60);
          confidenceReason = `Automated tests failed (${failedTests}/${totalTests}), contradicting high LLM score award.`;
        }

        const failedNames = (executionResults.failedTestsList || [])
          .map((f) => `"${f.name}" (${f.reason || 'Assertion Failed'})`)
          .join('; ');

        reasoning = `Deterministic test execution failed ${failedTests} of ${totalTests} test case(s): ${failedNames}. Full credit cannot be awarded.`;
        evidence = `Failed Test: ${failedNames}`;
      }

      const sortingFailed = (executionResults.failedTestsList || []).some(
        (f) => f.category === 'sorting' || (f.reason || '').toLowerCase().includes('sort')
      );
      if (sortingFailed && isSortingCriterion) {
        finalScore = Math.min(finalScore, Math.floor(c.maxPoints * 0.5));
        reasoning = 'Failed deterministic sorting assertion in test execution.';
      }
    }

    finalScore = Math.min(finalScore, c.maxPoints);
    totalScore += finalScore;

    if (confidence < 0.70) {
      reviewReasons.push(`Low confidence on criterion "${c.criterion}" (${confidence}): ${confidenceReason}`);
    }

    return {
      criterion: c.criterion,
      score: finalScore,
      maxPoints: c.maxPoints,
      confidence,
      confidenceReason,
      reasoning,
      evidence
    };
  });

  const avgConfidence = adjustedCriteria.length > 0
    ? Number((adjustedCriteria.reduce((sum, c) => sum + c.confidence, 0) / adjustedCriteria.length).toFixed(2))
    : 0.85;

  let overallConfidence = typeof evaluation.overallConfidence === 'number'
    ? Math.min(evaluation.overallConfidence, avgConfidence)
    : avgConfidence;
  overallConfidence = Math.max(0, Math.min(1, overallConfidence));

  const requiresTeacherReview = evaluation.requiresTeacherReview === true || overallConfidence < 0.70 || reviewReasons.length > 0;

  let reviewReason = evaluation.reviewReason && evaluation.reviewReason.trim().length > 0
    ? evaluation.reviewReason
    : '';

  if (requiresTeacherReview && !reviewReason) {
    reviewReason = reviewReasons.length > 0
      ? reviewReasons.join('; ')
      : `Overall confidence (${overallConfidence}) is below 0.70 threshold.`;
  }

  return {
    totalScore: Math.min(totalScore, hasFailures ? Math.floor(maxScore * 0.85) : maxScore),
    maxScore: maxScore || 100,
    overallConfidence,
    requiresTeacherReview,
    reviewReason,
    criteriaScores: adjustedCriteria
  };
}

function getRuleBoundedRubricEvaluation({ rubric, maxScore, executionResults, submissionText, isTheory = false }) {
  const criteria = rubric && rubric.length > 0 ? rubric : [
    { criterion: 'Logic & Correctness', maxPoints: 40 },
    { criterion: 'Edge Case Handling & Filtering', maxPoints: 30 },
    { criterion: 'Sorting & Proper Return Type', maxPoints: 30 }
  ];

  const isTheoryMode = isTheory || executionResults?.applicable === false || executionResults?.status === 'NOT_APPLICABLE';
  const subLower = (submissionText || '').toLowerCase();

  let calculatedTotal = 0;
  const criteriaScores = criteria.map((r, idx) => {
    const keywords = r.criterion.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const matchesKeyword = keywords.length === 0 || keywords.some((kw) => subLower.includes(kw));

    let pct = 0;
    let reasoning = '';
    let confidence = 0.85;
    let confidenceReason = 'Rule-based evaluation fallback.';

    if (isTheoryMode) {
      if (matchesKeyword) {
        pct = 1.0;
        reasoning = 'Theory explanation contains key concepts relevant to this criterion.';
        confidence = 0.75;
      } else {
        pct = 0.0;
        reasoning = 'Submission does not contain concepts or explanation relevant to this criterion.';
        confidence = 0.60;
        confidenceReason = 'Keyword heuristic failed to match submission text.';
      }
    } else {
      if (executionResults?.passed) {
        pct = 1.0;
        reasoning = 'Passed all test assertions.';
        confidence = 0.95;
      } else {
        pct = matchesKeyword ? 0.5 : 0.0;
        reasoning = 'Failed 1 or more test assertions.';
        confidence = 0.65;
        confidenceReason = 'Execution assertions failed under rule-based fallback.';
      }
    }

    const score = Math.floor(r.maxPoints * pct);
    calculatedTotal += score;

    return {
      criterion: r.criterion,
      score,
      maxPoints: r.maxPoints,
      confidence,
      confidenceReason,
      reasoning,
      evidence: extractCriterionSpecificEvidence(submissionText, r.criterion, idx)
    };
  });

  return applyDeterministicScoreEnforcement({
    evaluation: {
      totalScore: Math.min(calculatedTotal, maxScore),
      maxScore,
      overallConfidence: 0.65,
      requiresTeacherReview: true,
      reviewReason: 'Automated fallback evaluation executed.',
      criteriaScores
    },
    rubric: criteria,
    maxScore,
    executionResults
  });
}

function extractCriterionSpecificEvidence(submissionText, criterionName, index) {
  if (!submissionText) return '';
  const paragraphs = submissionText.split(/\n\s*\n+/).filter((p) => p.trim().length > 0);
  const lines = submissionText.split(/\n+/).filter((l) => l.trim().length > 0);

  const keywords = criterionName.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

  for (const para of paragraphs) {
    const pLower = para.toLowerCase();
    if (keywords.some((kw) => pLower.includes(kw))) {
      return para.trim().slice(0, 180);
    }
  }

  for (const line of lines) {
    const lLower = line.toLowerCase();
    if (keywords.some((kw) => lLower.includes(kw))) {
      return line.trim().slice(0, 180);
    }
  }

  if (paragraphs[index]) {
    return paragraphs[index].trim().slice(0, 180);
  }
  if (lines[index]) {
    return lines[index].trim().slice(0, 180);
  }

  return submissionText.slice(0, 180);
}