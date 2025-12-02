const axios = require('axios');
const { updateGHLContact } = require('./ghlService');

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Custom field IDs for transcript and summary
// contact.transcript and contact.call_summary
const TRANSCRIPT_FIELD_ID = 'KHujI9n0QTz9qmLMWqrr';
const SUMMARY_FIELD_ID = 'ICK8Dj0rDnKJsvrlJtZw';

/**
 * Summarizes a call transcript using OpenRouter GPT OSS 120B
 * @param {string} transcript - The call transcript text
 * @returns {Promise<string>} The summarized transcript
 */
async function summarizeTranscript(transcript) {
  try {
    console.log('=== Summarizing Transcript via OpenRouter ===');
    console.log('Transcript length:', transcript.length, 'characters');

    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: 'openai/gpt-oss-120b',
        provider: {
          order: ['novita'],
          quantizations: ['bf16']
        },
        messages: [
          {
            role: 'user',
            content: `Summarize this call transcript for me in 1 paragraph, 3-4 sentences only. Keep the exact context of the call.\n\n${transcript}`
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://shlf-ghl-automations.com',
          'X-Title': 'SHLF GHL Automations'
        }
      }
    );

    const summary = response.data.choices[0]?.message?.content;

    if (!summary) {
      throw new Error('No summary returned from OpenRouter');
    }

    console.log('Summary generated successfully');
    console.log('Summary length:', summary.length, 'characters');

    return summary;
  } catch (error) {
    console.error('Error summarizing transcript:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Updates contact custom fields with transcript and summary
 * @param {string} contactId - GHL contact ID
 * @param {string} transcript - The call transcript
 * @param {string} summary - The call summary
 * @returns {Promise<Object>} Update response
 */
async function updateContactWithTranscript(contactId, transcript, summary) {
  const apiKey = process.env.GHL_API_KEY;

  if (!apiKey) {
    throw new Error('GHL_API_KEY not configured in environment variables');
  }


  try {
    console.log('=== Updating Contact with Transcript and Summary ===');
    console.log('Contact ID:', contactId);

    const contactData = {
      customFields: [
        {
          id: TRANSCRIPT_FIELD_ID,
          value: transcript
        },
        {
          id: SUMMARY_FIELD_ID,
          value: summary
        }
      ]
    };

    const result = await updateGHLContact(contactId, contactData, apiKey);

    console.log('Contact updated successfully with transcript and summary');
    return result;
  } catch (error) {
    console.error('Error updating contact with transcript:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Processes a call transcript: saves to contact, summarizes, and saves summary
 * @param {string} contactId - GHL contact ID
 * @param {string} transcript - The call transcript
 * @returns {Promise<Object>} Processing result with transcript and summary
 */
async function processCallTranscript(contactId, transcript) {
  console.log('=== Processing Call Transcript ===');
  console.log('Contact ID:', contactId);
  console.log('Transcript preview:', transcript.substring(0, 200) + '...');

  // Step 1: Generate summary using OpenRouter
  const summary = await summarizeTranscript(transcript);

  // Step 2: Save both transcript and summary to contact custom fields
  await updateContactWithTranscript(contactId, transcript, summary);

  return {
    contactId,
    transcript,
    summary,
    transcriptLength: transcript.length,
    summaryLength: summary.length
  };
}

module.exports = {
  summarizeTranscript,
  updateContactWithTranscript,
  processCallTranscript
};
