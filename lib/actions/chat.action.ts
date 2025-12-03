"use server"

import { connectToDatabase } from "../mongoose";
import ChatGroup from "@/database/chatGroup.model";
import ChatMessage from "@/database/chatMessage.model";
import User from "@/database/user.model";
import Tag from "@/database/tag.model";
import { 
  CreateChatGroupParams, 
  GetChatGroupsParams, 
  JoinChatGroupParams, 
  SendMessageParams, 
  GetMessagesParams,
  UpdateChatGroupParams,
  DeleteChatGroupParams,
  GetModeratorChatGroupsParams
} from "./shared.types";
import { revalidatePath } from "next/cache";
import { FilterQuery, Types } from "mongoose";
import { escapeRegex } from "../utils";

// Helper function to convert Mongoose documents to plain objects
function toPlainObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle ObjectId instances
  if (obj instanceof Types.ObjectId) {
    return obj.toString();
  }
  
  // Handle objects with buffer property (ObjectId-like)
  if (typeof obj === 'object' && obj !== null && 'buffer' in obj) {
    // Check if it's a valid ObjectId
    try {
      if (Types.ObjectId.isValid(obj)) {
        return String(obj);
      }
    } catch {
      // Not a valid ObjectId, continue
    }
  }
  
  // Handle Date
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  // Handle objects with toJSON method (Mongoose documents) - check this before plain objects
  if (typeof obj === 'object' && obj !== null && typeof obj.toJSON === 'function') {
    return toPlainObject(obj.toJSON());
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => toPlainObject(item));
  }
  
  // Handle plain objects
  if (typeof obj === 'object' && obj !== null) {
    // Check if constructor name suggests it's an ObjectId
    if (obj.constructor && (obj.constructor.name === 'ObjectId' || obj.constructor.name === 'Types.ObjectId')) {
      return String(obj);
    }
    
    const plain: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Skip buffer property and internal Mongoose properties
        if (key === 'buffer' || key.startsWith('$__') || key === '_doc') {
          continue;
        }
        
        const value = obj[key];
        // Special handling for _id field which is commonly an ObjectId
        if (key === '_id') {
          if (value instanceof Types.ObjectId || (typeof value === 'object' && value !== null && 'buffer' in value)) {
            plain[key] = String(value);
          } else {
            plain[key] = toPlainObject(value);
          }
        } else {
          plain[key] = toPlainObject(value);
        }
      }
    }
    return plain;
  }
  
  // Return primitives as-is
  return obj;
}

export async function createChatGroup(params: CreateChatGroupParams) {
  try {
    await connectToDatabase();

    const { name, description, tags, moderatorId, path } = params;

    // Parallel verification of moderator and tags
    const [moderator, tagObjects] = await Promise.all([
      User.findById(moderatorId).select('_id').lean(),
      Tag.find({ _id: { $in: tags } }).select('_id').lean(),
    ]);

    if (!moderator) {
      throw new Error('Moderator not found');
    }

    if (tagObjects.length !== tags.length) {
      throw new Error('One or more tags not found');
    }

    // Create chat group
    const chatGroup = await ChatGroup.create({
      name,
      description,
      tags,
      moderator: moderatorId,
      members: [moderatorId], // Moderator is automatically a member
    });

    // Populate in parallel
    await Promise.all([
      chatGroup.populate('tags', '_id name'),
      chatGroup.populate('moderator', '_id clerkId name picture username'),
      chatGroup.populate('members', '_id clerkId name picture username'),
    ]);

    revalidatePath(path);
    return toPlainObject(chatGroup);
  } catch (error) {
    console.error('Error creating chat group:', error);
    throw error;
  }
}

export async function getChatGroups(params: GetChatGroupsParams) {
  try {
    await connectToDatabase();

    const { tagId, searchQuery, page = 1, pageSize = 10 } = params;
    const skipAmount = (page - 1) * pageSize;

    const query: FilterQuery<typeof ChatGroup> = {};

    if (tagId) {
      query.tags = tagId;
    }

    if (searchQuery) {
      const escapedQuery = escapeRegex(searchQuery);
      query.$or = [
        { name: { $regex: new RegExp(escapedQuery, 'i') } },
        { description: { $regex: new RegExp(escapedQuery, 'i') } },
      ];
    }

    const chatGroups = await ChatGroup.find(query)
      .populate('tags', '_id name')
      .populate('moderator', '_id clerkId name picture username')
      .populate('members', '_id clerkId name picture username')
      .sort({ createdAt: -1 })
      .skip(skipAmount)
      .limit(pageSize)
      .lean();

    const totalGroups = await ChatGroup.countDocuments(query);
    const isNext = totalGroups > skipAmount + chatGroups.length;

    return { chatGroups: toPlainObject(chatGroups), isNext };
  } catch (error) {
    console.error('Error getting chat groups:', error);
    throw error;
  }
}

export async function getChatGroupById(chatGroupId: string) {
  try {
    await connectToDatabase();

    const chatGroup = await ChatGroup.findById(chatGroupId)
      .populate('tags', '_id name')
      .populate('moderator', '_id clerkId name picture username')
      .populate('members', '_id clerkId name picture username')
      .lean()
      .exec();

    if (!chatGroup) {
      throw new Error('Chat group not found');
    }

    return toPlainObject(chatGroup);
  } catch (error) {
    console.error('Error getting chat group:', error);
    throw error;
  }
}

export async function joinChatGroup(params: JoinChatGroupParams) {
  try {
    await connectToDatabase();

    const { chatGroupId, userId, path } = params;

    const chatGroup = await ChatGroup.findById(chatGroupId);
    if (!chatGroup) {
      throw new Error('Chat group not found');
    }

    // Check if user is already a member
    if (chatGroup.members.some((m: any) => m.toString() === userId)) {
      // Already a member, return populated group
      await Promise.all([
        chatGroup.populate('tags', '_id name'),
        chatGroup.populate('moderator', '_id clerkId name picture username'),
        chatGroup.populate('members', '_id clerkId name picture username'),
      ]);
      return toPlainObject(chatGroup);
    }

    // Add user to members using $addToSet to prevent duplicates
    await ChatGroup.findByIdAndUpdate(
      chatGroupId,
      { $addToSet: { members: userId } },
      { new: true }
    );

    // Fetch updated group with populated fields
    const updatedGroup = await ChatGroup.findById(chatGroupId)
      .populate('tags', '_id name')
      .populate('moderator', '_id clerkId name picture username')
      .populate('members', '_id clerkId name picture username')
      .lean();

    if (!updatedGroup) {
      throw new Error('Chat group not found after update');
    }

    revalidatePath(path);
    return toPlainObject(updatedGroup);
  } catch (error) {
    console.error('Error joining chat group:', error);
    throw error;
  }
}

export async function sendMessage(params: SendMessageParams) {
  try {
    await connectToDatabase();

    const { content, authorId, chatGroupId, path } = params;

    // Verify chat group exists and user is a member in parallel
    const chatGroup = await ChatGroup.findById(chatGroupId).select('members').lean() as any;
    if (!chatGroup) {
      throw new Error('Chat group not found');
    }

    if (!chatGroup.members?.some((m: any) => m.toString() === authorId)) {
      throw new Error('User is not a member of this chat group');
    }

    // Create message and update chat group in parallel
    const [message] = await Promise.all([
      ChatMessage.create({
        content,
        author: authorId,
        chatGroup: chatGroupId,
      }),
      ChatGroup.findByIdAndUpdate(
        chatGroupId,
        { updatedAt: new Date() },
        { new: false } // Don't fetch updated doc, just update
      ),
    ]);

    // Populate author info
    await message.populate('author', '_id clerkId name picture username');

    revalidatePath(path);
    return toPlainObject(message);
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export async function getMessages(params: GetMessagesParams) {
  try {
    await connectToDatabase();

    const { chatGroupId, page = 1, pageSize = 50 } = params;
    const skipAmount = (page - 1) * pageSize;

    // Parallel: verify chat group exists and get messages count
    const [chatGroup, totalMessages] = await Promise.all([
      ChatGroup.findById(chatGroupId).select('_id').lean(),
      ChatMessage.countDocuments({ chatGroup: chatGroupId }),
    ]);

    if (!chatGroup) {
      throw new Error('Chat group not found');
    }

    const messages = await ChatMessage.find({ chatGroup: chatGroupId })
      .populate('author', '_id clerkId name picture username')
      .sort({ createdAt: -1 })
      .skip(skipAmount)
      .limit(pageSize)
      .lean();

    // Reverse to show oldest first
    const reversedMessages = messages.reverse();
    const isNext = totalMessages > skipAmount + messages.length;

    return { messages: toPlainObject(reversedMessages), isNext };
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
}

export async function getUserChatGroups(userId: string) {
  try {
    await connectToDatabase();

    const chatGroups = await ChatGroup.find({ members: userId })
      .populate('tags', '_id name')
      .populate('moderator', '_id clerkId name picture username')
      .sort({ updatedAt: -1 })
      .lean();

    return toPlainObject(chatGroups);
  } catch (error) {
    console.error('Error getting user chat groups:', error);
    throw error;
  }
}

export async function getModeratorChatGroups(params: GetModeratorChatGroupsParams) {
  try {
    await connectToDatabase();

    const { moderatorId, searchQuery, page = 1, pageSize = 10 } = params;
    const skipAmount = (page - 1) * pageSize;

    const query: FilterQuery<typeof ChatGroup> = { moderator: moderatorId };

    if (searchQuery) {
      const escapedQuery = escapeRegex(searchQuery);
      query.$or = [
        { name: { $regex: new RegExp(escapedQuery, 'i') } },
        { description: { $regex: new RegExp(escapedQuery, 'i') } },
      ];
    }

    const chatGroups = await ChatGroup.find(query)
      .populate('tags', '_id name')
      .populate('moderator', '_id clerkId name picture username')
      .populate('members', '_id clerkId name picture username')
      .sort({ createdAt: -1 })
      .skip(skipAmount)
      .limit(pageSize)
      .lean();

    const totalGroups = await ChatGroup.countDocuments(query);
    const isNext = totalGroups > skipAmount + chatGroups.length;

    return { chatGroups: toPlainObject(chatGroups), isNext };
  } catch (error) {
    console.error('Error getting moderator chat groups:', error);
    throw error;
  }
}

export async function updateChatGroup(params: UpdateChatGroupParams) {
  try {
    await connectToDatabase();

    const { chatGroupId, name, description, tags, path } = params;

    // Verify all tags exist (only check IDs, not full documents)
    const tagCount = await Tag.countDocuments({ _id: { $in: tags } });
    if (tagCount !== tags.length) {
      throw new Error('One or more tags not found');
    }

    // Update chat group
    const chatGroup = await ChatGroup.findByIdAndUpdate(
      chatGroupId,
      {
        name,
        description,
        tags,
        updatedAt: new Date(),
      },
      { new: true }
    )
      .populate('tags', '_id name')
      .populate('moderator', '_id clerkId name picture username')
      .populate('members', '_id clerkId name picture username')
      .lean();

    if (!chatGroup) {
      throw new Error('Chat group not found');
    }

    revalidatePath(path);
    return toPlainObject(chatGroup);
  } catch (error) {
    console.error('Error updating chat group:', error);
    throw error;
  }
}

export async function deleteChatGroup(params: DeleteChatGroupParams) {
  try {
    await connectToDatabase();

    const { chatGroupId, path } = params;

    // Delete all messages in this chat group first
    await ChatMessage.deleteMany({ chatGroup: chatGroupId });

    // Delete the chat group
    const chatGroup = await ChatGroup.findByIdAndDelete(chatGroupId);

    if (!chatGroup) {
      throw new Error('Chat group not found');
    }

    revalidatePath(path);
    return { success: true };
  } catch (error) {
    console.error('Error deleting chat group:', error);
    throw error;
  }
}

