import type { NcContext } from '~/interface/config';
import Noco from '~/Noco';
import { MetaTable } from '~/utils/globals';
import { extractProps } from '~/helpers/extractProps';
import { v4 as uuidv4 } from 'uuid';

export interface AiConversationType {
  id?: string;
  user_id?: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
}

export default class AiConversation implements AiConversationType {
  id?: string;
  user_id?: string;
  title?: string;
  created_at?: string;
  updated_at?: string;

  constructor(conversation: Partial<AiConversationType>) {
    Object.assign(this, conversation);
  }

  public static castType(conversation: AiConversation): AiConversation {
    return conversation && new AiConversation(conversation);
  }

  public static async insert(
    context: NcContext,
    conversation: Partial<AiConversationType>,
    ncMeta = Noco.ncMeta,
  ) {
    const insertObj = extractProps(conversation, [
      'id',
      'user_id',
      'title',
      'created_at',
      'updated_at',
    ]);

    // Generate UUID if not provided
    if (!insertObj.id) {
      insertObj.id = uuidv4();
    }

    const { id } = await ncMeta.metaInsert2(
      context.workspace_id,
      context.base_id,
      MetaTable.AI_CONVERSATIONS,
      insertObj,
    );

    return AiConversation.get(context, id, ncMeta);
  }

  public static async update(
    context: NcContext,
    conversationId: string,
    conversation: Partial<AiConversationType>,
    ncMeta = Noco.ncMeta,
  ) {
    const updateObj = extractProps(conversation, [
      'title',
      'updated_at',
    ]);

    await ncMeta.metaUpdate(
      context.workspace_id,
      context.base_id,
      MetaTable.AI_CONVERSATIONS,
      updateObj,
      conversationId,
    );

    return AiConversation.get(context, conversationId, ncMeta);
  }

  public static async get(
    context: NcContext,
    conversationId: string,
    ncMeta = Noco.ncMeta,
  ) {
    const conversation = await ncMeta.metaGet2(
      context.workspace_id,
      context.base_id,
      MetaTable.AI_CONVERSATIONS,
      conversationId,
    );

    return AiConversation.castType(conversation);
  }

  public static async list(
    context: NcContext,
    userId: string,
    limit = 50,
    offset = 0,
    ncMeta = Noco.ncMeta,
  ) {
    const conversations = await ncMeta.metaList2(
      context.workspace_id,
      context.base_id,
      MetaTable.AI_CONVERSATIONS,
      {
        condition: { user_id: userId },
        orderBy: { updated_at: 'desc' },
        limit,
        offset,
      },
    );

    return conversations.map((conversation) => AiConversation.castType(conversation));
  }

  public static async delete(
    context: NcContext,
    conversationId: string,
    ncMeta = Noco.ncMeta,
  ) {
    await ncMeta.metaDelete(
      context.workspace_id,
      context.base_id,
      MetaTable.AI_CONVERSATIONS,
      conversationId,
    );
  }
}
