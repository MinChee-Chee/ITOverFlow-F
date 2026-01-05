import { getAnswers } from '@/lib/actions/answer.action';
import React from 'react'
import Filter from './Filter';
import { AnswerFilters } from '@/constants/filters';
import Link from 'next/link';
import Image from 'next/image';
import ExpandableAnswer from './ExpandableAnswer';
import Votes from './Votes';
import Pagination from './Pagination';
import ClientTimestamp from './ClientTimestamp';
import CommentsSection from './CommentsSection';
import ReportButton from './ReportButton';

interface Props {
    questionId: string;
    userId: string;
    totalAnswers: number;
    page?: number;
    filter?: string;
}

// Helper function to safely convert unknown ID to string
const getIdString = (id: unknown): string => {
  if (id === null || id === undefined) return '';
  if (typeof id === 'string') return id;
  if (typeof id === 'object' && '_id' in id) return String((id as any)._id);
  return String(id);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AllAnswers = async ({questionId, userId, totalAnswers, page, filter} :Props) => {
    // Ensure userId is always a string (handle ObjectId edge cases)
    const userIdString = userId ? (typeof userId === 'string' ? userId : String(userId)) : "";
    
    const answer = await getAnswers({
        questionId,
        page: page ? +page : 1,
        sortBy: filter
      })
    return (
    <div className="mt-11">
        <div className="flex items-center justify-between">
        <h3 className="primary-text-gradient">{totalAnswers} Answers</h3>

        <Filter filters={AnswerFilters}/>
        </div>
        
        <div>
            {answer.answers.map((answer) => {
                const answerId = getIdString(answer._id);
                return (
                <article key={answerId}
                className='light-border border-b py-10'>
                    <div className="flex items-center justify-between">
                        <div>
                        <Link href={`/profile/${answer.author.clerkId}`} className="flex flex-1 items-start gap-1 sm:items-center">
                            <Image
                                src={answer.author.picture}
                                width={18}
                                height={18}
                                alt="profile"
                                className="rounded-full object-cover max-sm:mt-0.5"
                            />
                            <div className="flex flex-col sm:flex-row sm:items-center">
                                <p className="body-semibold text-dark300_light700">
                                {answer.author.name}
                                </p>

                                <ClientTimestamp
                                  createdAt={answer.createdAt}
                                  prefix="answered "
                                  className="small-regular text-light400_light500 ml-0.5 mt-0.5 line-clamp-1"
                                />
                            </div>
                        </Link>
                            <div className='flex justify-end'> 

                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Votes
                                type="Answer"
                                itemId={JSON.stringify(answerId)}
                                userId={userIdString ? JSON.stringify(userIdString): ""}
                                upvotes={answer.upvotes.length}
                                hasupVoted={userIdString ? answer.upvotes.some((id: any) => id.toString() === userIdString): false}
                                downvotes={answer.downvotes.length}
                                hasdownVoted={userIdString ? answer.downvotes.some((id: any) => id.toString() === userIdString): false}
                            />
                            {userIdString && (
                                <ReportButton
                                    type="answer"
                                    answerId={answerId}
                                    userId={userIdString}
                                />
                            )}
                        </div>
                    </div>
                    <div className="mt-4">
                      <ExpandableAnswer content={answer.content} />
                    </div>
                    <CommentsSection 
                        answerId={answerId} 
                        currentUserId={userIdString || undefined}
                    />
                </article>
            );
            })}
        </div>

        <div className="mt-9 w-full">
      <Pagination
        pageNumber = {page ? +page : 1}
        isNext = {answer.isNextAnswer}
      />
      </div>
    </div>
  )
}

export default AllAnswers