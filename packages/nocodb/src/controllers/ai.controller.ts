import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Res,
  Req,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { GlobalGuard } from '~/guards/global/global.guard';
import { PagedResponseImpl } from '~/helpers/PagedResponse';
import { NcError } from '~/helpers/catchError';
import { AiConversation, AiMessage } from '~/models';
import { NcContext } from '~/interface/config';
import { z } from 'zod';
import { ConfigService } from '@nestjs/config';
import { AiService } from '~/services/ai.service';

// Validation schemas
const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationId: z.string().optional(),
  model: z.string().optional().default('gpt-4o-mini'),
});

const conversationQuerySchema = z.object({
  limit: z.string().optional().transform(val => parseInt(val || '10')),
  offset: z.string().optional().transform(val => parseInt(val || '0')),
});

@Controller()
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
  ) {}

  @Post('/api/v1/db/data/v1/noco/default/ai/chat')
  @UseGuards(GlobalGuard)
  async chat(
    @Req() req: Request & { context: NcContext },
    @Res() res: Response,
    @Body() body: unknown,
  ) {
    try {
      // Debug: Log configuration
      const aiConfig = this.configService.get('ai');
      console.log('AI Config:', {
        enabled: aiConfig?.enabled,
        provider: aiConfig?.provider,
        model: aiConfig?.model,
        hasApiKey: !!aiConfig?.apiKey,
        apiKeyLength: aiConfig?.apiKey?.length || 0
      });

      // Validate request body
      const parseResult = chatMessageSchema.safeParse(body);
      if (!parseResult.success) {
        throw new HttpException('Invalid request body: ' + parseResult.error.message, HttpStatus.BAD_REQUEST);
      }

      const { message, conversationId, model } = parseResult.data;
      const userId = req.context.user.id;

      console.log('Chat request:', { message, conversationId, model, userId });

             // Ensure we have a valid base_id for the context
       const context = {
         ...req.context,
         base_id: req.context.base_id || 'default'
       };
       
       let conversation;
       if (conversationId) {
         console.log('Using existing conversation:', conversationId);
         conversation = await AiConversation.get(context, conversationId);
         if (!conversation || conversation.user_id !== userId) {
           throw new HttpException('Conversation not found or access denied', HttpStatus.FORBIDDEN);
         }
                } else {
           // Create new conversation
           console.log('Creating new conversation for user:', userId);
           console.log('Context:', {
             workspace_id: context.workspace_id,
             base_id: context.base_id
           });
           
           conversation = await AiConversation.insert(context, {
           user_id: userId,
           title: message.slice(0, 50),
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString(),
         });
         console.log('New conversation created with ID:', conversation.id);
       }

             // Save user message
       await AiMessage.insert(context, {
         conversation_id: conversation.id,
         role: 'user',
         content_json: JSON.stringify({ text: message }),
         created_at: new Date().toISOString(),
       });

      // Set up SSE response
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-Conversation-Id': conversation.id,
      });

                    // Get AI response using the new process message method
       let aiResponse = '';
       try {
         console.log('Calling AI service for processing message...');
         console.log('Message to send to AI:', message);
         
         // Use the new processMessage method that handles both general chat and database queries
         aiResponse = await this.aiService.processMessage(message, context);
         console.log('AI Response generated:', aiResponse);
         
         // Send the complete response as a single chunk
         const dataToSend = JSON.stringify({ text: aiResponse });
         console.log('Sending response to frontend:', dataToSend);
         res.write(`data: ${dataToSend}\n\n`);
         
       } catch (aiError) {
         console.error('AI Service Error:', aiError);
         aiResponse = 'Sorry, I encountered an error while processing your request. Please try again.';
         res.write(`data: ${JSON.stringify({ text: aiResponse })}\n\n`);
       }

             // Save AI response
       await AiMessage.insert(context, {
         conversation_id: conversation.id,
         role: 'assistant',
         content_json: JSON.stringify({ text: aiResponse }),
         created_at: new Date().toISOString(),
       });

       // Update conversation timestamp
       await AiConversation.update(context, conversation.id, {
         updated_at: new Date().toISOString(),
       });

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      console.error('AI Chat Error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: error.message || 'Internal server error',
      });
    }
  }

  @Get('/api/v1/db/data/v1/noco/default/ai/conversations')
  @UseGuards(GlobalGuard)
  async getConversations(
    @Req() req: Request & { context: NcContext },
    @Query() query: unknown,
  ) {
    try {
      // Validate query parameters
      const parseResult = conversationQuerySchema.safeParse(query);
      if (!parseResult.success) {
        throw new HttpException('Invalid query parameters: ' + parseResult.error.message, HttpStatus.BAD_REQUEST);
      }

      const { limit, offset } = parseResult.data;
      const userId = req.context.user.id;

      const conversations = await AiConversation.list(req.context, userId, limit, offset);

      return new PagedResponseImpl(conversations, {
        limit,
        offset,
        count: conversations.length,
      });
    } catch (error) {
      console.error('Get Conversations Error:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/api/v1/db/data/v1/noco/default/ai/conversations/:conversationId')
  @UseGuards(GlobalGuard)
  async getConversation(
    @Req() req: Request & { context: NcContext },
    @Param('conversationId') conversationId: string,
  ) {
    try {
      const userId = req.context.user.id;

      const conversation = await AiConversation.get(req.context, conversationId);

      if (!conversation || conversation.user_id !== userId) {
        throw new HttpException('Conversation not found or access denied', HttpStatus.FORBIDDEN);
      }

      return conversation;
    } catch (error) {
      console.error('Get Conversation Error:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/api/v1/db/data/v1/noco/default/ai/conversations/:conversationId/messages')
  @UseGuards(GlobalGuard)
  async getMessages(
    @Req() req: Request & { context: NcContext },
    @Param('conversationId') conversationId: string,
    @Query() query: unknown,
  ) {
    try {
      // Validate query parameters
      const parseResult = conversationQuerySchema.safeParse(query);
      if (!parseResult.success) {
        throw new HttpException('Invalid query parameters: ' + parseResult.error.message, HttpStatus.BAD_REQUEST);
      }

      const { limit, offset } = parseResult.data;
      const userId = req.context.user.id;

      const conversation = await AiConversation.get(req.context, conversationId);
      if (!conversation || conversation.user_id !== userId) {
        throw new HttpException('Conversation not found or access denied', HttpStatus.FORBIDDEN);
      }

      const messages = await AiMessage.list(req.context, conversationId, limit, offset);

      return new PagedResponseImpl(messages, {
        limit,
        offset,
        count: messages.length,
      });
    } catch (error) {
      console.error('Get Messages Error:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('/api/v1/db/data/v1/noco/default/ai/conversations/:conversationId')
  @UseGuards(GlobalGuard)
  async deleteConversation(
    @Req() req: Request & { context: NcContext },
    @Param('conversationId') conversationId: string,
  ) {
    try {
      const userId = req.context.user.id;

      const conversation = await AiConversation.get(req.context, conversationId);
      if (!conversation || conversation.user_id !== userId) {
        throw new HttpException('Conversation not found or access denied', HttpStatus.FORBIDDEN);
      }

      // Delete messages first
      await AiMessage.deleteByConversation(req.context, conversationId);

      // Delete conversation
      await AiConversation.delete(req.context, conversationId);

      return { success: true };
    } catch (error) {
      console.error('Delete Conversation Error:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/api/v1/db/data/v1/noco/default/ai/health')
  @UseGuards(GlobalGuard)
  async healthCheck(@Res() res: Response) {
    try {
      // Debug: Log configuration
      const aiConfig = this.configService.get('ai');
      console.log('Health check - AI Config:', {
        enabled: aiConfig?.enabled,
        provider: aiConfig?.provider,
        model: aiConfig?.model,
        hasApiKey: !!aiConfig?.apiKey,
        apiKeyLength: aiConfig?.apiKey?.length || 0
      });

      const healthStatus = await this.aiService.healthCheck();
      
      res.json({
        status: healthStatus.status,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        sdk: 'vercel-ai',
        details: healthStatus.details
      });
    } catch (error) {
      console.error('Health Check Error:', error);
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
