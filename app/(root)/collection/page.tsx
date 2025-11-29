/* eslint-disable @typescript-eslint/no-explicit-any */
import QuestionCard from "@/components/cards/QuestionCard";
import Filter from "@/components/shared/Filter";
import NoResult from "@/components/shared/NoResult";
import Pagination from "@/components/shared/Pagination";
import LocalSearchbar from "@/components/shared/search/LocalSearchbar";
import { QuestionFilters } from "@/constants/filters";
import { getSavedQuestions } from "@/lib/actions/user.action";
import { SearchParamsProps } from "@/types";
import {auth} from "@clerk/nextjs/server";
import { Suspense } from "react";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saved Questions | Dev Overflow for HCMUTE future engineers",
  description: "saved questions on Dev Overflow",
}

export const dynamic = 'force-dynamic';

export default async function Collection({searchParams}: SearchParamsProps) {
    const{ userId } = await auth();
    if(!userId) return null;
  const result = await getSavedQuestions({
    clerkId: userId,
    searchQuery: searchParams.q,
    filter: searchParams.filter,
    page: searchParams.page ? +searchParams.page : 1
  });

  return (
    <>
        <h1 className="h1-bold text-dark100_light900">Saved Questions</h1> 

      <div className="mt-11 flex justify-between gap-5 max-sm:flex-col sm:items-center">
        <Suspense fallback={<div className="flex-1 h-[56px] animate-pulse bg-light-800 dark:bg-dark-300 rounded-[10px]" />}>
          <LocalSearchbar 
            route="/collection"
            iconPosition="left"
            imgSrc="/assets/icons/search.svg"
            placeholder="Search for questions"
            otherClasses="flex-1"
          />
        </Suspense>

        <Suspense fallback={<div className="min-h-[56px] sm:min-w-[170px] animate-pulse bg-light-800 dark:bg-dark-300 rounded-md" />}>
          <Filter
            filters={QuestionFilters}
            otherClasses="min-h-[56px] sm:min-w-[170px]"
          />
        </Suspense>
      </div>


      <div className="mt-10 flex w-full flex-col gap-6">
        {result.questions.length > 0 ?
          result.questions.map((question: any) => (
            <QuestionCard 
              key={question._id}
              _id={question._id}
              title={question.title}
              tags={question.tags}
              author={question.author}
              upvotes={question.upvotes}
              views={question.views}
              answers={question.answers}
              createdAt={question.createdAt}
            />
          ))
          : <NoResult 
            title="There’s no saved questions to show"
            description="Be the first to break the silence! 🚀 Ask a Question and kickstart the discussion. our query could be the next big thing others learn from. Get involved! 💡"
            link="/ask-question"
            linkTitle="Ask a Question"
          />}
      </div>
      <div className="mt-9">
      <Suspense fallback={<div className="h-10 animate-pulse bg-light-800 dark:bg-dark-300 rounded-md" />}>
        <Pagination
          pageNumber = {searchParams?.page ? +searchParams.page : 1}
          isNext = {result.isNext}
        />
      </Suspense>
      </div>
    </>
  )
}