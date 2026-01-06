import QuestionCard from "@/components/cards/QuestionCard";
import HomeFilters from "@/components/home/HomeFilters";
import Filter from "@/components/shared/Filter";
import NoResult from "@/components/shared/NoResult";
import Pagination from "@/components/shared/Pagination";
import LocalSearchbar from "@/components/shared/search/LocalSearchbar";
import { Button } from "@/components/ui/button";
import { HomePageFilters } from "@/constants/filters";
import { getQuestions, getRecommendedQuestions } from "@/lib/actions/question.action";
import { SearchParamsProps } from "@/types";
import Link from "next/link";
import { Suspense } from "react";

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";

export const metadata: Metadata = {
  title: "Home | IT Overflow for HCMUTE future engineers",
  description: "IT Overflow is a community of developers, engineers, and future engineers who are passionate about learning and sharing knowledge.",
}

// Enable partial prerendering for better performance
export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 60 seconds for semi-static content

// Separate component for questions list to enable streaming
async function QuestionsList({ searchParams }: SearchParamsProps) {
  const resolvedSearchParams = await searchParams;
  const { userId } = await auth();

  let result;

  if (resolvedSearchParams?.filter === 'recommended') {
    if (userId) {
      result = await getRecommendedQuestions({
        userId,
        searchQuery: resolvedSearchParams.q,
        page: resolvedSearchParams.page ? +resolvedSearchParams.page : 1,
      });
    } else {
      result = {
        questions: [],
        isNext: false,
      }
    }
  } else {
    result = await getQuestions({
      searchQuery: resolvedSearchParams.q,
      filter: resolvedSearchParams.filter,
      page: resolvedSearchParams.page ? +resolvedSearchParams.page : 1,
    });
  }

  return (
    <>
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
            title="There's no question to show"
            description="Be the first to break the silence! 🚀 Ask a Question and kickstart the discussion. our query could be the next big thing others learn from. Get involved! 💡"
            link="/ask-question"
            linkTitle="Ask a Question"
          />}
      </div>
      <div className="mt-9">
        <Pagination
          pageNumber={resolvedSearchParams?.page ? +resolvedSearchParams.page : 1}
          isNext={result.isNext}
        />
      </div>
    </>
  );
}

export default async function Home({ searchParams }: SearchParamsProps) {
  return (
    <>
      <div className="flex w-full flex-col-reverse justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="h1-bold text-dark100_light900">All Questions</h1> 

        <Link href="/ask-question" className="flex justify-end max-sm:w-full">
          <Button className="primary-gradient min-h-[46px] px-4 py-3 !text-light-900">
            Ask a Question
          </Button>
        </Link> 
      </div> 

      <div className="mt-11 flex justify-between gap-5 max-sm:flex-col sm:items-center">
        <Suspense fallback={<div className="flex-1 h-[56px] animate-pulse bg-light-800 dark:bg-dark-300 rounded-[10px]" />}>
          <LocalSearchbar 
            route="/"
            iconPosition="left"
            imgSrc="/assets/icons/search.svg"
            placeholder="Search for questions"
            otherClasses="flex-1"
          />
        </Suspense>

        <Suspense fallback={<div className="min-h-[56px] sm:min-w-[170px] animate-pulse bg-light-800 dark:bg-dark-300 rounded-md" />}>
          <Filter
            filters={HomePageFilters}
            otherClasses="min-h-[56px] sm:min-w-[170px]"
            containerClasses="hidden max-md:flex"
          />
        </Suspense>
      </div>

      <Suspense fallback={<div className="mt-6 h-10 animate-pulse bg-light-800 dark:bg-dark-300 rounded-md" />}>
        <HomeFilters />
      </Suspense>

      <Suspense fallback={
        <div className="mt-10 flex w-full flex-col gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 animate-pulse bg-light-800 dark:bg-dark-300 rounded-lg" />
          ))}
        </div>
      }>
        <QuestionsList searchParams={searchParams} />
      </Suspense>
    </>
  )
}
