import type { OpenAI } from 'openai';

import { getServerConfig } from '@/config/server';
import { getOpenAIAuthFromRequest } from '@/const/fetch';
import { ChatErrorType, ErrorType } from '@/types/fetch';
import { OpenAIImagePayload } from '@/types/openai/image';

import { checkAuth } from '../../auth';
import { createAzureOpenai } from '../createAzureOpenai';
import { createOpenai } from '../createOpenai';
import { createErrorResponse } from '../errorResponse';
import { createImageGeneration } from './createImageGeneration';

export const runtime = 'edge';

export const POST = async (req: Request) => {
  const payload = (await req.json()) as OpenAIImagePayload;

  const { apiKey, accessCode, endpoint, useAzure, apiVersion } = getOpenAIAuthFromRequest(req);

  const result = checkAuth({ accessCode, apiKey });

  if (!result.auth) {
    return createErrorResponse(result.error as ErrorType);
  }

  let openai: OpenAI;

  const { USE_AZURE_OPENAI } = getServerConfig();
  const useAzureOpenAI = useAzure || USE_AZURE_OPENAI;

  try {
    if (useAzureOpenAI) {
      openai = createAzureOpenai({
        apiVersion,
        endpoint,
        model: payload.model,
        userApiKey: apiKey,
      });
    } else {
      openai = createOpenai(apiKey, endpoint);
    }
  } catch (error) {
    if ((error as Error).cause === ChatErrorType.NoAPIKey) {
      return createErrorResponse(ChatErrorType.NoAPIKey);
    }

    console.error(error); // log error to trace it
    return createErrorResponse(ChatErrorType.InternalServerError);
  }

  return createImageGeneration({ openai, payload });
};
