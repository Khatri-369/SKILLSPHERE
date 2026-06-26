import config from '../config/index.js';

/**
 * Calculate Jaccard similarity score locally as a fallback
 * @param {Array<string>} sourceSkills - Skills requested by the gig
 * @param {Array<string>} targetSkills - Skills possessed by the freelancer
 * @returns {number} Jaccard similarity score between 0.0 and 1.0
 */
export const calculateJaccardSimilarity = (sourceSkills, targetSkills) => {
  if (!sourceSkills || !targetSkills || sourceSkills.length === 0 || targetSkills.length === 0) {
    return 0;
  }
  const setA = new Set(sourceSkills.map((s) => s.toLowerCase().trim()).filter(Boolean));
  const setB = new Set(targetSkills.map((s) => s.toLowerCase().trim()).filter(Boolean));

  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return parseFloat((intersection.size / union.size).toFixed(4));
};

/**
 * Call HuggingFace Inference API for semantic text similarity
 * Model: sentence-transformers/all-MiniLM-L6-v2
 * @param {string} sourceSentence - Space-separated gig skills
 * @param {Array<string>} targetSentences - List of space-separated freelancer skills
 * @returns {Promise<Array<number>>} Array of similarity scores matching targets length
 */
export const calculateSemanticSimilarity = async (sourceSentence, targetSentences) => {
  const apiKey = config.huggingfaceApiKey;

  // Verify API Key is not empty and not default placeholder
  const isKeyConfigured = apiKey && apiKey !== 'your_huggingface_api_key';

  if (!isKeyConfigured) {
    throw new Error('HuggingFace API Key is not configured or is a placeholder.');
  }

  const response = await fetch(
    'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs: {
          source_sentence: sourceSentence,
          sentences: targetSentences,
        },
      }),
      signal: AbortSignal.timeout(5000), // 5 seconds timeout limit
    }
  );

  if (!response.ok) {
    throw new Error(`HuggingFace API response status error: ${response.status}`);
  }

  const result = await response.json();

  // The output of Sentence Similarity API should be an array of similarity score numbers
  if (!Array.isArray(result)) {
    if (result && result.error) {
      throw new Error(`HuggingFace API returned model error: ${result.error}`);
    }
    throw new Error('HuggingFace similarity response is not a valid array.');
  }

  return result.map((score) => parseFloat(Number(score).toFixed(4)));
};

/**
 * Recommends freelancers for a Gig using HF semantic matching or local Jaccard fallback
 * @param {object} gig - The Gig object
 * @param {Array<object>} freelancerProfiles - Array of FreelancerProfile documents
 * @returns {Promise<object>} Object containing recommendations array and usedAI flag
 */
export const getRecommendedFreelancers = async (gig, freelancerProfiles) => {
  const gigSkills = gig.skillsRequired || [];
  
  if (freelancerProfiles.length === 0) {
    return { recommendations: [], usedAI: false };
  }

  let scores = [];
  let usedAI = false;

  try {
    const sourceSentence = gigSkills.join(' ').trim() || gig.title;
    const targetSentences = freelancerProfiles.map((p) => (p.skills || []).join(' ').trim() || 'none');

    // Run semantic similarity checks
    scores = await calculateSemanticSimilarity(sourceSentence, targetSentences);
    usedAI = true;
    console.log(`🤖 [AI RECOMMENDATION] Successfully retrieved semantic scores via HuggingFace Inference API.`);
  } catch (error) {
    console.warn(
      `⚠️ [AI RECOMMENDATION] HuggingFace service failed or unconfigured (${error.message}). Falling back to local Jaccard similarity.`
    );
    // Local Jaccard Fallback
    scores = freelancerProfiles.map((p) => calculateJaccardSimilarity(gigSkills, p.skills || []));
  }

  // Combine profiles with their scores
  const recommendations = freelancerProfiles.map((profile, index) => {
    const score = scores[index] !== undefined ? scores[index] : 0;
    return {
      profile,
      similarityScore: score,
    };
  });

  // Sort by score in descending order
  recommendations.sort((a, b) => b.similarityScore - a.similarityScore);

  // Return top 10 recommended entries
  return {
    recommendations: recommendations.slice(0, 10),
    usedAI,
  };
};
