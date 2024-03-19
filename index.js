// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { fileURLToPath } from "url";

import {
  AccessDeniedException,
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

import fs from 'fs/promises';

// Function to load an image and convert it to Base64
async function loadImageAsBase64(filePath) {
  try {
    // Read the file content in binary format
    const data = await fs.readFile(filePath);
    // Convert the binary data to a Base64 string
    const base64String = data.toString('base64');
    return base64String;
  } catch (error) {
    console.error('Error loading the image:', error);
    throw error; // Rethrow to handle it in the caller
  }
}


/**
 * @typedef {Object} ResponseBody
 * @property {string} completion
 */

/**
 * Invokes the Anthropic Claude 3 model to run an inference using the input
 * provided in the request body.
 *
 * @param {string} prompt - The prompt that you want Claude to complete.
 * @returns {string} The inference response (completion) from the model.
 */
export const invokeClaude = async (prompt, imagePath) => {
  const client = new BedrockRuntimeClient({ region: "us-east-1" });

  const modelId = "anthropic.claude-3-haiku-20240307-v1:0";

  const imageBase64 = await loadImageAsBase64(imagePath);
  

  /* The different model providers have individual request and response formats.
   * For the format, ranges, and default values for Anthropic Claude, refer to:
   * https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-claude.html
   */
  const payload = {
    messages:[
        {
            role: "user", 
            content: [
              {
                  type: "image",
                  source: {
                  type: "base64",
                  media_type: "image/png",
                  data: imageBase64
                }
              },
                {
                    "type":"text",
                    "text": prompt  
                }
            ]
        },
    ],
    max_tokens: 500,
    temperature: 0.5,
    anthropic_version: "bedrock-2023-05-31",
    stop_sequences: ["\n\nHuman:"],
  };

  const command = new InvokeModelCommand({
    body: JSON.stringify(payload),
    contentType: "application/json",
    accept: "application/json",
    modelId,
  });

  try {
    const response = await client.send(command);
    const decodedResponseBody = new TextDecoder().decode(response.body);

    /** @type {ResponseBody} */
    const responseBody = JSON.parse(decodedResponseBody);

    return responseBody.content[0].text;
  } catch (err) {
    if (err instanceof AccessDeniedException) {
      console.error(
        `Access denied. Ensure you have the correct permissions to invoke ${modelId}.`,
      );
    } else {
      throw err;
    }
  }
};

// Invoke the function if this file was run directly.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const prompt = 'Provide me more details about this image';
  const imagePath = "S3Permissions.png";	
  console.log("\nModel: Anthropic Claude v3");
  console.log(`Prompt: ${prompt}`);

  const completion = await invokeClaude(prompt, imagePath);
  console.log("Completion:");
  console.log(completion);
  console.log("\n");
}

