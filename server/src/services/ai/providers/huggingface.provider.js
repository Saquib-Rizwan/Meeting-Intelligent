const HF_API_BASE_URL = "https://api-inference.huggingface.co/models";

import { AppError } from "../../../utils/app-error.js";

const getHeaders = () => {
  if (!process.env.HUGGINGFACE_API_KEY) {
    throw new AppError("HUGGINGFACE_API_KEY is not configured", 500);
  }

  return {
    Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
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
