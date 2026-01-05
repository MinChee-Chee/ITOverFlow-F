"use server"

import { connectToDatabase } from "../mongoose"
import Question from "@/database/question.model"
import Answer from "@/database/answer.model"
import User from "@/database/user.model"
import Tag from "@/database/tag.model"

export interface ContentItem {
  _id: string
  type: 'question' | 'answer'
  title?: string
  content: string
  author: {
    _id: string
    name: string
    picture: string
    clerkId: string
  }
  views?: number
  upvotes: number
  downvotes: number
  answers?: number
  score: number
  createdAt: Date
  tags?: Array<{ _id: string; name: string }>
  questionId?: string
  questionTitle?: string
}

/**
 * Wilson Score Interval - Industry standard for ranking (used by Reddit, Yelp)
 * Calculates the statistical lower bound of quality, balancing vote ratio with sample size
 * Formula: (p + z²/2n - z√((p(1-p) + z²/4n)/n)) / (1 + z²/n)
 * Where: p = positive ratio, n = total votes, z = confidence level (1.96 for 95% confidence)
 */
function wilsonScore(upvotes: number, downvotes: number): number {
  const n = upvotes + downvotes
  if (n === 0) return 0
  
  const p = upvotes / n
  const z = 1.96 // 95% confidence interval
  
  const numerator = p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n)
  const denominator = 1 + (z * z) / n
  
  return numerator / denominator
}

/**
 * Hotness Algorithm (for Questions) - Time decay with gravity
 * Formula: hotness = 1 / (1 + hoursSinceCreation / 24)^gravity
 * Higher gravity = faster decay (2.5 for questions to prioritize freshness)
 * Why: Questions need freshness - new questions should float to top to get answered
 * Optimized: Early return for very old content to avoid expensive calculations
 */
function hotnessScore(createdAt: Date, gravity: number = 2.5): number {
  const now = Date.now()
  const createdAtTime = createdAt.getTime()
  const hoursSinceCreation = (now - createdAtTime) / (1000 * 60 * 60)
  
  // Early return for very old content (~10+ years) to avoid expensive Math.pow
  if (hoursSinceCreation > 87600) return 0
  
  return 1 / Math.pow(1 + hoursSinceCreation / 24, gravity)
}

/**
 * Calculate Question Score (Moderator Dashboard - Quality-focused)
 * Strategy: Wilson Score (primary) + Reduced Time Decay + Engagement
 * For moderation, we want to see high-quality content regardless of age
 * Formula: (wilson × 60) + (hotness × 40) + engagement bonuses
 * Why: Moderators need to see high-engagement content, not just new content
 */
function calculateQuestionScore(
  upvotes: number,
  downvotes: number,
  views: number = 0,
  answers: number = 0,
  createdAt: Date = new Date()
): number {
  // Wilson Score (0-1 scale, statistical quality) - PRIMARY FACTOR
  const wilson = wilsonScore(upvotes, downvotes)
  
  // Hotness factor (0-1 scale, reduced time decay for moderation)
  // Use lower gravity (1.5 instead of 2.5) to reduce time penalty
  const hotness = hotnessScore(createdAt, 1.5)
  
  // Engagement bonuses (optimized: early exit for capped values)
  const viewBonus = views > 300 ? 3 : views * 0.01
  const answerBonus = answers * 1.5
  
  // Combined: Wilson-weighted for quality, reduced hotness for freshness
  // 60% Wilson (quality), 40% hotness (freshness), plus engagement
  const baseScore = (wilson * 60) + (hotness * 40)
  const finalScore = baseScore + viewBonus + answerBonus
  
  return Math.round(finalScore * 10) / 10
}

/**
 * Calculate Answer Score (Correctness-focused)
 * Strategy: Wilson Score only (no time decay) + Minimal Engagement
 * Answers need correctness - a 2020 answer with 100 upvotes is still valuable
 * Time decay is bad for answers because correct code/solutions don't expire
 * Formula: (wilson × 100) + minimal view bonus
 * Why: Correct answers remain valuable; time decay isn't needed
 */
function calculateAnswerScore(
  upvotes: number,
  downvotes: number,
  views: number = 0
): number {
  // Wilson Score (0-1 scale, statistical quality)
  const wilson = wilsonScore(upvotes, downvotes)
  
  // Engagement bonus (minimal, as views are less important for answers)
  const viewBonus = Math.min(views * 0.005, 2) // Cap at 2 points
  
  // Combined: Pure Wilson Score (correctness) + minimal engagement
  // 100% Wilson (correctness) + minimal engagement
  const baseScore = wilson * 100
  const finalScore = baseScore + viewBonus
  
  return Math.round(finalScore * 10) / 10
}

export async function getModeratorDashboardContent(params: {
  page?: number
  pageSize?: number
  type?: 'question' | 'answer' | 'all'
  sortBy?: 'highScore' | 'lowScore' | 'recent' | 'old'
}) {
  try {
    await connectToDatabase()

    const { page = 1, pageSize = 20, type = 'all', sortBy = 'highScore' } = params
    const skipAmount = (page - 1) * pageSize
    const isScoreSort = sortBy === 'highScore' || sortBy === 'lowScore'

    // For score-based sorting: Use a reasonable limit (e.g., 1000 items) to balance performance and accuracy
    // This ensures we see high-scoring content without loading everything
    const SCORE_SORT_LIMIT = 1000
    const contentItems: ContentItem[] = []

    // Optimize: Only fetch what we need based on type
    const shouldFetchQuestions = type === 'all' || type === 'question'
    const shouldFetchAnswers = type === 'all' || type === 'answer'

    // Parallel fetching for better performance
    const [questionsResult, answersResult, totalCounts] = await Promise.all([
      // Fetch questions
      shouldFetchQuestions
        ? (isScoreSort
            ? Question.find({})
                .populate({ path: 'author', model: User, select: '_id clerkId name picture' })
                .populate({ path: 'tags', model: Tag, select: '_id name' })
                .limit(SCORE_SORT_LIMIT)
                .lean()
            : (() => {
                const questionLimit = type === 'all' ? Math.floor(pageSize / 2) : pageSize
                return Question.find({})
                  .populate({ path: 'author', model: User, select: '_id clerkId name picture' })
                  .populate({ path: 'tags', model: Tag, select: '_id name' })
                  .sort(sortBy === 'recent' ? { createdAt: -1 } : { createdAt: 1 })
                  .skip(skipAmount)
                  .limit(questionLimit)
                  .lean()
              })())
        : Promise.resolve([]),
      
      // Fetch answers
      shouldFetchAnswers
        ? (isScoreSort
            ? Answer.find({})
                .populate({ path: 'author', model: User, select: '_id clerkId name picture' })
                .populate({ path: 'question', model: Question, select: '_id title' })
                .limit(SCORE_SORT_LIMIT)
                .lean()
            : (() => {
                const answerLimit = type === 'all' ? Math.floor(pageSize / 2) : pageSize
                return Answer.find({})
                  .populate({ path: 'author', model: User, select: '_id clerkId name picture' })
                  .populate({ path: 'question', model: Question, select: '_id title' })
                  .sort(sortBy === 'recent' ? { createdAt: -1 } : { createdAt: 1 })
                  .skip(skipAmount)
                  .limit(answerLimit)
                  .lean()
              })())
        : Promise.resolve([]),
      
      // Get total counts in parallel (only if needed)
      Promise.all([
        type === 'answer' ? Promise.resolve(0) : Question.countDocuments({}),
        type === 'question' ? Promise.resolve(0) : Answer.countDocuments({}),
      ]),
    ])

    const [totalQuestions, totalAnswers] = totalCounts
    const totalItems = totalQuestions + totalAnswers

    // Process questions - optimized with cached calculations
    if (shouldFetchQuestions && Array.isArray(questionsResult)) {
      for (const question of questionsResult) {
        const upvotes = Array.isArray(question.upvotes) ? question.upvotes.length : 0
        const downvotes = Array.isArray(question.downvotes) ? question.downvotes.length : 0
        const views = question.views || 0
        const answers = Array.isArray(question.answers) ? question.answers.length : 0
        const createdAt = question.createdAt || new Date()
        const author = question.author as any

        contentItems.push({
          _id: String(question._id || ''),
          type: 'question',
          title: question.title,
          content: question.content,
          author: {
            _id: String(author?._id || ''),
            name: author?.name || 'Unknown',
            picture: author?.picture || '/assets/images/default-avatar.png',
            clerkId: author?.clerkId || '',
          },
          views,
          upvotes,
          downvotes,
          answers,
          score: calculateQuestionScore(upvotes, downvotes, views, answers, createdAt),
          createdAt,
          tags: Array.isArray(question.tags)
            ? question.tags.map((tag: any) => ({
                _id: String(tag._id || ''),
                name: tag.name || '',
              }))
            : [],
        })
      }
    }

    // Process answers
    if (shouldFetchAnswers && Array.isArray(answersResult)) {
      for (const answer of answersResult) {
        const upvotes = Array.isArray(answer.upvotes) ? answer.upvotes.length : 0
        const downvotes = Array.isArray(answer.downvotes) ? answer.downvotes.length : 0
        const createdAt = answer.createdAt || new Date()

        contentItems.push({
          _id: String((answer as any)?._id || ''),
          type: 'answer',
          content: answer.content,
          author: {
            _id: String((answer.author as any)?._id || ''),
            name: (answer.author as any)?.name || 'Unknown',
            picture: (answer.author as any)?.picture || '/assets/images/default-avatar.png',
            clerkId: (answer.author as any)?.clerkId || '',
          },
          upvotes,
          downvotes,
          score: calculateAnswerScore(upvotes, downvotes, 0),
          createdAt,
          questionId: (answer.question as any)?._id ? String((answer.question as any)._id) : undefined,
          questionTitle: (answer.question as any)?.title,
        })
      }
    }

    // Sort based on sortBy parameter
    // For score sorting: sort in memory (already fetched)
    // For date sorting: already sorted in DB query, no need to sort again
    if (isScoreSort) {
      // Use efficient sort with early comparison
      contentItems.sort((a, b) => 
        sortBy === 'highScore' ? b.score - a.score : a.score - b.score
      )
    }
    // Date sorting is already handled by MongoDB query, no need to sort again

    // Apply pagination
    const paginatedContent = contentItems.slice(skipAmount, skipAmount + pageSize)
    const hasMore = skipAmount + pageSize < contentItems.length || 
                    (!isScoreSort && (
                      (type === 'all' && (totalQuestions > skipAmount + Math.floor(pageSize / 2) || 
                                          totalAnswers > skipAmount + Math.floor(pageSize / 2))) ||
                      (type === 'question' && totalQuestions > skipAmount + pageSize) ||
                      (type === 'answer' && totalAnswers > skipAmount + pageSize)
                    ))

    return {
      content: paginatedContent,
      totalItems,
      isNext: hasMore,
    }
  } catch (error) {
    console.error("Error fetching moderator dashboard content:", error)
    return {
      content: [],
      totalItems: 0,
      isNext: false,
    }
  }
}
