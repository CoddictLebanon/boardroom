import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { GenerateResolutionDto } from './dto/generate-resolution.dto';

@Injectable()
export class AiService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateResolution(companyName: string, dto: GenerateResolutionDto) {
    const systemPrompt = `You are a corporate secretary assistant helping draft formal board resolutions for ${companyName}.

Your job is to:
1. Ask clarifying questions one at a time to gather necessary information
2. Generate formal resolution text using proper legal language
3. Use the standard format: WHEREAS clauses followed by RESOLVED clauses

When you have enough information, generate the resolution in this format:

RESOLUTION OF THE BOARD OF DIRECTORS
OF ${companyName.toUpperCase()}

Category: [Category Name]

WHEREAS, [background and context]...

NOW, THEREFORE, BE IT RESOLVED, that [the resolution text]...

Be concise but thorough. Ask only necessary questions.`;

    const messages = dto.conversationHistory?.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })) || [];

    messages.push({ role: 'user', content: dto.message });

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      content: responseText,
      conversationHistory: [...messages, { role: 'assistant' as const, content: responseText }],
    };
  }
}
