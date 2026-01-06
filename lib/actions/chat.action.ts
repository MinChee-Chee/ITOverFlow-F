"use server"

import { connectToDatabase } from "../mongoose";
import ChatGroup from "@/database/chatGroup.model";
import ChatMessage from "@/database/chatMessage.model";
import ChatGroupRead from "@/database/chatGroupRead.model";
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
  GetModeratorChatGroupsParams,
  BanUserFromChatGroupParams,
  DeleteMessageParams
} from "./shared.types";
import { revalidatePath } from "next/cache";
import { FilterQuery, Types } from "mongoose";
import { escapeRegex, getBanErrorMessage } from "../utils";

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

    const { tagId, searchQuery, page = 1, pageSize = 10, currentUserId, joinedOnly } = params;
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

    // Filter by membership if joinedOnly is true
    if (joinedOnly && currentUserId) {
      query.members = { $in: [new Types.ObjectId(currentUserId)] };
    }

    const chatGroups = await ChatGroup.find(query)
      .populate('tags', '_id name')
      .populate('moderator', '_id clerkId name picture username')
      .populate('members', '_id clerkId name picture username')
      .sort({ createdAt: -1 })
      .skip(skipAmount)
      .limit(pageSize)
      .lean();

    // Attach unread info and latest message snippet for the current user, if available
    let chatGroupsWithUnread = chatGroups;

    if (currentUserId && chatGroups.length > 0) {
      const groupIds = chatGroups.map((g: any) => g._id);

      const [readStates, latestMessages] = await Promise.all([
        ChatGroupRead.find({
          user: currentUserId,
          chatGroup: { $in: groupIds },
        })
          .select('chatGroup lastReadAt')
          .lean(),
        // Get the latest message per group
        ChatMessage.aggregate([
          { $match: { chatGroup: { $in: groupIds } } },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: '$chatGroup',
              content: { $first: '$content' },
              createdAt: { $first: '$createdAt' },
            },
          },
        ]),
      ]);

      const readMap = new Map(
        readStates.map((r: any) => [String(r.chatGroup), r.lastReadAt]),
      );

      const latestMap = new Map(
        latestMessages.map((m: any) => [
          String(m._id),
          { content: m.content, createdAt: m.createdAt as Date },
        ]),
      );

      // Check ban status for all groups in parallel
      const banChecks = await Promise.all(
        groupIds.map((groupId: any) => 
          isUserBannedFromChatGroup(String(groupId), currentUserId)
        )
      );

      const banMap = new Map(
        groupIds.map((groupId: any, index: number) => [
          String(groupId),
          banChecks[index],
        ])
      );

      chatGroupsWithUnread = chatGroups
        .filter((group: any) => {
          // Filter out groups where user is banned
          const banStatus = banMap.get(String(group._id));
          return !banStatus?.banned;
        })
        .map((group: any) => {
          const lastReadAt = readMap.get(String(group._id)) as Date | undefined;
          const updatedAt = group.updatedAt ? new Date(group.updatedAt) : null;

          const latest = latestMap.get(String(group._id)) as
            | { content: string; createdAt: Date }
            | undefined;

          const hasUnread =
            !!updatedAt && (!lastReadAt || updatedAt > lastReadAt);

          // If there is a latest message after lastReadAt, use it as the snippet
          const hasUnreadMessage =
            latest && (!lastReadAt || latest.createdAt > lastReadAt);

          const lastMessageSnippet = latest?.content ?? undefined;

          return {
            ...group,
            hasUnread,
            lastMessageSnippet: hasUnreadMessage ? lastMessageSnippet : undefined,
          };
        });
    }

    const totalGroups = await ChatGroup.countDocuments(query);
    const isNext = totalGroups > skipAmount + chatGroups.length;

    return { chatGroups: toPlainObject(chatGroupsWithUnread), isNext };
  } catch (error) {
    console.error('Error getting chat groups:', error);
    throw error;
  }
}

export async function getChatGroupById(chatGroupId: string, userId?: string) {
  try {
    await connectToDatabase();

    // If userId is provided, check ban status FIRST before fetching the group
    if (userId) {
      const banStatus = await isUserBannedFromChatGroup(chatGroupId, userId);
      if (banStatus.banned) {
      // Ensure banned user is removed from members array immediately
      await ChatGroup.findByIdAndUpdate(
        chatGroupId,
        { $pull: { members: new Types.ObjectId(userId) } },
        { new: false }
      );
      throw new Error(getBanErrorMessage(banStatus.expiresAt));
      }
    }

    const chatGroup = await ChatGroup.findById(chatGroupId)
      .populate('tags', '_id name')
      .populate('moderator', '_id clerkId name picture username')
      .populate('members', '_id clerkId name picture username')
      .lean()
      .exec();

    if (!chatGroup) {
      throw new Error('Chat group not found');
    }

    // Double-check ban status after fetching (in case ban was added between checks)
    if (userId) {
      const finalBanCheck = await isUserBannedFromChatGroup(chatGroupId, userId);
      if (finalBanCheck.banned) {
        // Ensure banned user is removed from members array
        await ChatGroup.findByIdAndUpdate(
          chatGroupId,
          { $pull: { members: new Types.ObjectId(userId) } },
          { new: false }
        );
        const expiresAt = finalBanCheck.expiresAt;
        const hoursRemaining = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)) : 0;
        const days = Math.floor(hoursRemaining / 24);
        const hours = hoursRemaining % 24;
        let timeRemaining = '';
        if (days > 0) {
          timeRemaining = `${days} day${days !== 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}`;
        } else {
          timeRemaining = `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`;
        }
        throw new Error(`You have been banned from this chat group for 2 days due to a violation of the community guidelines. The ban will expire in ${timeRemaining}.`);
      }
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

    // FIRST: Always check ban status before doing anything else
    const banStatus = await isUserBannedFromChatGroup(chatGroupId, userId);
    if (banStatus.banned) {
      // If banned, ensure they're removed from members array
      await ChatGroup.findByIdAndUpdate(
        chatGroupId,
        { $pull: { members: new Types.ObjectId(userId) } },
        { new: false }
      );
      throw new Error(getBanErrorMessage(banStatus.expiresAt));
    }

    const chatGroup = await ChatGroup.findById(chatGroupId);
    if (!chatGroup) {
      throw new Error('Chat group not found');
    }

    // Check if user is already a member
    const userIdObjectId = new Types.ObjectId(userId);
    const isMember = chatGroup.members.some((m: any) => {
      const memberId = m instanceof Types.ObjectId ? m.toString() : String(m);
      return memberId === userId;
    });
    
    if (isMember) {
      // User is already a member, verify they're not banned (double-check)
      const doubleCheckBan = await isUserBannedFromChatGroup(chatGroupId, userId);
      if (doubleCheckBan.banned) {
        // If banned, remove them from members array immediately
        await ChatGroup.findByIdAndUpdate(
          chatGroupId,
          { $pull: { members: userIdObjectId } },
          { new: false }
        );
        const expiresAt = doubleCheckBan.expiresAt;
        const hoursRemaining = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)) : 0;
        const days = Math.floor(hoursRemaining / 24);
        const hours = hoursRemaining % 24;
        let timeRemaining = '';
        if (days > 0) {
          timeRemaining = `${days} day${days !== 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}`;
        } else {
          timeRemaining = `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`;
        }
        throw new Error(`You have been banned from this chat group for 2 days due to a violation of the community guidelines. The ban will expire in ${timeRemaining}.`);
      }
      
      // Already a member and not banned, return populated group
      await Promise.all([
        chatGroup.populate('tags', '_id name'),
        chatGroup.populate('moderator', '_id clerkId name picture username'),
        chatGroup.populate('members', '_id clerkId name picture username'),
      ]);
      return toPlainObject(chatGroup);
    }

    // User is not a member, add them to members using $addToSet to prevent duplicates
    // Final ban check before adding
    const finalBanCheck = await isUserBannedFromChatGroup(chatGroupId, userId);
    if (finalBanCheck.banned) {
      const expiresAt = finalBanCheck.expiresAt;
      const hoursRemaining = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)) : 0;
      const days = Math.floor(hoursRemaining / 24);
      const hours = hoursRemaining % 24;
      let timeRemaining = '';
      if (days > 0) {
        timeRemaining = `${days} day${days !== 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}`;
      } else {
        timeRemaining = `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`;
      }
      throw new Error(`You have been banned from this chat group for 2 days due to a violation of the community guidelines. The ban will expire in ${timeRemaining}.`);
    }

    await ChatGroup.findByIdAndUpdate(
      chatGroupId,
      { $addToSet: { members: userIdObjectId } },
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

    // Check if user is banned from this chat group
    const banStatus = await isUserBannedFromChatGroup(chatGroupId, authorId);
    if (banStatus.banned) {
      throw new Error(getBanErrorMessage(banStatus.expiresAt));
    }

    // Verify chat group exists and user is a member in parallel
    const chatGroup = await ChatGroup.findById(chatGroupId)
      .select('members')
      .lean() as any;
    if (!chatGroup) {
      throw new Error('Chat group not found');
    }

    // Check if user is a member, and also verify they're not banned (double-check)
    const isMember = chatGroup.members?.some((m: any) => m.toString() === authorId);
    if (!isMember) {
      throw new Error('User is not a member of this chat group');
    }

    // Final ban check before allowing message send
    const finalBanCheck = await isUserBannedFromChatGroup(chatGroupId, authorId);
    if (finalBanCheck.banned) {
      // Remove from members if still there
      await ChatGroup.findByIdAndUpdate(
        chatGroupId,
        { $pull: { members: new Types.ObjectId(authorId) } },
        { new: false }
      );
      const expiresAt = finalBanCheck.expiresAt;
      const hoursRemaining = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)) : 0;
      const days = Math.floor(hoursRemaining / 24);
      const hours = hoursRemaining % 24;
      let timeRemaining = '';
      if (days > 0) {
        timeRemaining = `${days} day${days !== 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}`;
      } else {
        timeRemaining = `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`;
      }
      throw new Error(`You have been banned from this chat group for 2 days due to a violation of the community guidelines. The ban will expire in ${timeRemaining}.`);
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

    const { chatGroupId, page = 1, pageSize = 50, userId } = params;
    const skipAmount = (page - 1) * pageSize;

    // Check if user is banned (if userId is provided)
    if (userId) {
      const banStatus = await isUserBannedFromChatGroup(chatGroupId, userId);
      if (banStatus.banned) {
      throw new Error(getBanErrorMessage(banStatus.expiresAt));
      }
    }

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

    // Filter out groups where user is banned (parallelize for better performance)
    const banChecks = await Promise.all(
      chatGroups.map((group: any) => 
        isUserBannedFromChatGroup(String(group._id), userId)
      )
    );

    const filteredGroups = chatGroups.filter((group: any, index: number) => {
      return !banChecks[index].banned;
    });

    return toPlainObject(filteredGroups);
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

export async function banUserFromChatGroup(params: BanUserFromChatGroupParams) {
  try {
    await connectToDatabase();

    const { chatGroupId, userId, moderatorId, path } = params;

    // Verify chat group exists and moderator has permission
    const chatGroup = await ChatGroup.findById(chatGroupId);
    if (!chatGroup) {
      throw new Error('Chat group not found');
    }

    // Verify moderator exists
    const moderator = await User.findById(moderatorId);
    if (!moderator) {
      throw new Error('Moderator not found');
    }

    // Note: Role verification (moderator/admin) is done at the API route level
    // This allows any moderator or admin to ban users from any chat group, 
    // regardless of whether they manage that specific chat group

    // Check if user is trying to ban themselves
    if (userId === moderatorId) {
      throw new Error('You cannot ban yourself');
    }

    // Note: The check for banning group moderators is handled at the API route level
    // since we need Clerk role information which is available there.
    // Any moderator or admin can ban regular users from any chat group.

    // Get all message IDs before deletion for Pusher broadcasting
    const messagesToDelete = await ChatMessage.find({
      chatGroup: chatGroupId,
      author: userId,
    }).select('_id').lean();

    const messageIds = messagesToDelete.map((m: any) => m._id.toString());

    // Delete all messages from the banned user in this chat group
    await ChatMessage.deleteMany({
      chatGroup: chatGroupId,
      author: userId,
    });

    // Calculate ban expiration (2 days from now)
    const bannedAt = new Date();
    const expiresAt = new Date(bannedAt);
    expiresAt.setDate(expiresAt.getDate() + 2);

    // Remove any existing ban entry for this user first, then add new one
    // Also remove user from members array
    const userIdObjectId = new Types.ObjectId(userId);
    
    // First, remove user from members and any existing ban entries
    await ChatGroup.findByIdAndUpdate(
      chatGroupId,
      {
        $pull: { 
          members: userIdObjectId,
          bannedUsers: { userId: userIdObjectId }, // Remove any existing ban entry
        },
      },
      { new: false }
    );
    
    // Then add the new ban entry - use $setOnInsert or direct push
    // Use findOneAndUpdate to ensure atomic operation
    const updatedGroup = await ChatGroup.findOneAndUpdate(
      { _id: chatGroupId },
      {
        $push: {
          bannedUsers: {
            userId: userIdObjectId,
            bannedAt: bannedAt,
            expiresAt: expiresAt,
          },
        },
      },
      { new: true }
    )
      .populate('tags', '_id name')
      .populate('moderator', '_id clerkId name picture username')
      .populate('members', '_id clerkId name picture username')
      .lean();

    if (!updatedGroup) {
      throw new Error('Failed to ban user from chat group');
    }

    revalidatePath(path);
    
    // Return result with message IDs and ban expiration for Pusher broadcasting
    return {
      ...toPlainObject(updatedGroup),
      messageIds,
      banExpiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    console.error('Error banning user from chat group:', error);
    throw error;
  }
}

// Helper function to check if a user is currently banned from a chat group
export async function isUserBannedFromChatGroup(chatGroupId: string, userId: string): Promise<{ banned: boolean; expiresAt?: Date; bannedAt?: Date }> {
  try {
    await connectToDatabase();

    // Normalize userId to ObjectId for comparison
    const userIdObjectId = new Types.ObjectId(userId);
    const userIdStr = userIdObjectId.toString();

    const chatGroup = await ChatGroup.findById(chatGroupId)
      .select('bannedUsers')
      .lean() as any;

    if (!chatGroup) {
      return { banned: false };
    }

    if (!chatGroup.bannedUsers || chatGroup.bannedUsers.length === 0) {
      return { banned: false };
    }

    const now = new Date();
    
    // Check all ban entries
    for (const ban of chatGroup.bannedUsers) {
      if (!ban || !ban.userId) {
        continue;
      }
      
      // Normalize ban userId to string for comparison
      let banUserIdStr: string;
      if (ban.userId instanceof Types.ObjectId) {
        banUserIdStr = ban.userId.toString();
      } else if (typeof ban.userId === 'object' && ban.userId.toString) {
        banUserIdStr = ban.userId.toString();
      } else {
        banUserIdStr = String(ban.userId);
      }
      
      // Compare using ObjectId comparison for accuracy
      const isMatch = banUserIdStr === userIdStr || 
                      (ban.userId instanceof Types.ObjectId && ban.userId.equals(userIdObjectId)) ||
                      (typeof ban.userId === 'object' && String(ban.userId) === userIdStr);
      
      if (isMatch) {
        // Check expiration
        const expiresAt = new Date(ban.expiresAt);
        if (expiresAt > now) {
          // User is banned and ban hasn't expired
          return {
            banned: true,
            expiresAt: expiresAt,
            bannedAt: new Date(ban.bannedAt),
          };
        }
        // Ban has expired, continue checking other entries
      }
    }

    return { banned: false };
  } catch (error) {
    console.error('Error checking ban status:', error, { chatGroupId, userId });
    // If there's an error checking, assume not banned to avoid blocking legitimate users
    return { banned: false };
  }
}

export async function deleteMessage(params: DeleteMessageParams) {
  try {
    await connectToDatabase();

    const { messageId, userId, path } = params;

    // Find the message and verify ownership
    const message = await ChatMessage.findById(messageId).select('author chatGroup').lean();
    if (!message || Array.isArray(message)) {
      throw new Error('Message not found');
    }

    // Verify the user is the author of the message
    const authorId = message.author instanceof Types.ObjectId 
      ? message.author.toString() 
      : String(message.author);
    
    if (authorId !== userId) {
      throw new Error('You can only delete your own messages');
    }

    const chatGroupId = message.chatGroup instanceof Types.ObjectId
      ? message.chatGroup.toString()
      : (message.chatGroup ? String(message.chatGroup) : undefined);

    // Delete the message
    await ChatMessage.findByIdAndDelete(messageId);

    revalidatePath(path);
    return { success: true, messageId, chatGroupId };
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}

