import type { NcContext } from '~/interface/config';
import Noco from '~/Noco';
import { MetaTable } from '~/utils/globals';
import { extractProps } from '~/helpers/extractProps';
import { v4 as uuidv4 } from 'uuid';

export interface AiMessageType {
  id?: string;
  conversation_id?: string;
  role?: 'system' | 'user' | 'assistant' | 'tool';
  content_json?: any;
  provider_msg_id?: string;
  tool_call_json?: any;
  created_at?: string;
}

export default class AiMessage implements AiMessageType {
  id?: string;
  conversation_id?: string;
  role?: 'system' | 'user' | 'assistant' | 'tool';
  content_json?: any;
  provider_msg_id?: string;
  tool_call_json?: any;
  created_at?: string;

  constructor(message: Partial<AiMessageType>) {
    Object.assign(this, message);
  }

  public static castType(message: AiMessage): AiMessage {
    return message && new AiMessage(message);
  }

  public static async insert(
    context: NcContext,
    message: Partial<AiMessageType>,
    ncMeta = Noco.ncMeta,
  ) {
    const insertObj = extractProps(message, [
      'id',
      'conversation_id',
      'role',
      'content_json',
      'provider_msg_id',
      'tool_call_json',
      'created_at',
    ]);

    // Generate UUID if not provided
    if (!insertObj.id) {
      insertObj.id = uuidv4();
    }

    const { id } = await ncMeta.metaInsert2(
      context.workspace_id,
      context.base_id,
      MetaTable.AI_MESSAGES,
      insertObj,
    );

    return AiMessage.get(context, id, ncMeta);
  }

  public static async update(
    context: NcContext,
    messageId: string,
    message: Partial<AiMessageType>,
    ncMeta = Noco.ncMeta,
  ) {
    const updateObj = extractProps(message, [
      'content_json',
      'provider_msg_id',
      'tool_call_json',
    ]);

    await ncMeta.metaUpdate(
      context.workspace_id,
      context.base_id,
      MetaTable.AI_MESSAGES,
      updateObj,
      messageId,
    );

    return AiMessage.get(context, messageId, ncMeta);
  }

  public static async get(
    context: NcContext,
    messageId: string,
    ncMeta = Noco.ncMeta,
  ) {
    const message = await ncMeta.metaGet2(
      context.workspace_id,
      context.base_id,
      MetaTable.AI_MESSAGES,
      messageId,
    );

    return AiMessage.castType(message);
  }

  public static async list(
    context: NcContext,
    conversationId: string,
    limit = 100,
    offset = 0,
    ncMeta = Noco.ncMeta,
  ) {
    const messages = await ncMeta.metaList2(
      context.workspace_id,
      context.base_id,
      MetaTable.AI_MESSAGES,
      {
        condition: { conversation_id: conversationId },
        orderBy: { created_at: 'asc' },
        limit,
        offset,
      },
    );

    return messages.map((message) => AiMessage.castType(message));
  }

  public static async delete(
    context: NcContext,
    messageId: string,
    ncMeta = Noco.ncMeta,
  ) {
    await ncMeta.metaDelete(
      context.workspace_id,
      context.base_id,
      MetaTable.AI_MESSAGES,
      messageId,
    );
  }

  public static async deleteByConversation(
    context: NcContext,
    conversationId: string,
    ncMeta = Noco.ncMeta,
  ) {
    await ncMeta.metaDelete(
      context.workspace_id,
      context.base_id,
      MetaTable.AI_MESSAGES,
      { conversation_id: conversationId },
    );
  }
}
