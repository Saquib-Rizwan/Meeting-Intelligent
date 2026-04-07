const HF_API_BASE_URL = "https://api-inference.huggingface.co/models";

import { AppError } from "../../../utils/app-error.js";
import { env } from "../../../config/env.js";

const getHeaders = () => {
  if (!env.huggingFaceApiKey) {
    throw new AppError("HUGGINGFACE_API_KEY is not configured", 500);
  }

  return {
    Authorization: `Bearer ${env.huggingFaceApiKey}`,
    "Content-Type": "application/json"
  };
};

const callInferenceApi = async (model, payload) => {
  const response = await fetch(`${HF_API_BASE_URL}/${model}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      ...payload,
      options: {
        wait_for_model: true
      }
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new AppError(`Hugging Face request failed for model ${model}`, 502, {
      status: response.status,
      details
    });
  }

  return response.json();
};

export const huggingFaceProvider = {
  providerName: "huggingface",

  async summarizeChunk(text) {
    const result = await callInferenceApi("facebook/bart-large-cnn", {
      inputs: text,
      parameters: {
        max_length: 180,
        min_length: 40,
        do_sample: false
      }
    });

    if (!Array.isArray(result) || !result[0]?.summary_text) {
      throw new AppError("Unexpected summarization response from Hugging Face", 502, {
        result
      });
    }

    return result[0].summary_text.trim();
  },

  async extractQA(question, context) {
    const result = await callInferenceApi("deepset/roberta-base-squad2", {
      inputs: {
        question,
        context
      }
    });

    return {
      answer: result.answer || "",
      score: result.score || 0
    };
  },

  async generateGroundedAnswer({ question, context }) {
    const prompt = [
      "You are a helpful meeting assistant.",
      "Answer the user's question in a natural, concise way using only the transcript context.",
      "Do not invent facts.",
      "If the answer is uncertain, say that briefly.",
      "Do not include citations or bullet labels unless they are clearly helpful.",
      "",
      `Question: ${question}`,
      "",
      "Transcript context:",
      context,
      "",
      "Answer:"
    ].join("\n");

    const result = await callInferenceApi(env.huggingFaceChatModel, {
      inputs: prompt,
      parameters: {
        max_new_tokens: 180,
        temperature: 0.2,
        return_full_text: false
      }
    });

    const generatedText = Array.isArray(result)
      ? result[0]?.generated_text || result[0]?.summary_text || ""
      : result?.generated_text || result?.summary_text || "";

    return generatedText.trim();
  },

  async sentimentAnalysis(text) {
    const result = await callInferenceApi(
      "distilbert-base-uncased-finetuned-sst-2-english",
      {
        inputs: text
      }
    );

    const top = Array.isArray(result?.[0]) ? result[0][0] : Array.isArray(result) ? result[0] : null;

    return {
      label: top?.label || "UNKNOWN",
      score: top?.score || 0
    };
  }
};
