/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import Question from "@/database/question.model";
import { connectToDatabase } from "../mongoose";
import { SearchParams } from "./shared.types";
import Tag from "@/database/tag.model";
import Answer from "@/database/answer.model";
import User from "@/database/user.model";
import { escapeRegex } from "../utils";

const SearchableTypes = ["question", "user", "answer", "tag"];

export async function globalSearch(params: SearchParams) {
    try {
      await connectToDatabase();
  
      const { query, type } = params;
      const escapedQuery = escapeRegex(query);
      const regexQuery = { $regex: escapedQuery, $options: "i" };
  
      let results = [];
  
      const modelsAndTypes = [
        { model: Question, searchField: "title", type: "question" },
        { model: User, searchField: "name", type: "user" },
        { model: Answer, searchField: "content", type: "answer" },
        { model: Tag, searchField: "name", type: "tag" },
      ];

      const typeLower = type?.toLowerCase();
  
      if (!typeLower || !SearchableTypes.includes(typeLower)) {
        const searchPromises = modelsAndTypes.map(({ model, searchField, type }) => {
          let searchQuery: any;
          
          if (type === "user") {
            searchQuery = {
              $or: [
                { name: regexQuery },
                { username: regexQuery },
                { email: regexQuery },
              ],
            };
          } else {
            searchQuery = { [searchField]: regexQuery };
          }
          
          return model
            .find(searchQuery)
            .select(type === "user" ? "_id clerkId name username" : type === "answer" ? "_id question content" : `_id ${searchField}`)
            .limit(2)
            .lean()
            .then(queryResults =>
              queryResults.map((item: any) => ({
                title: type === "answer" ? `Answers containing ${query}` : type === "user" ? (item.name || item.username) : item[searchField],
                type,
                id: type === "user" ? item.clerkId : type === "answer" ? item.question : item._id,
              }))
            );
        });
        
        const searchResults = await Promise.all(searchPromises);
        results = searchResults.flat();
      } else {
        const modelInfo = modelsAndTypes.find((item) => item.type === typeLower);
  
        if (!modelInfo) {
          throw new Error("Invalid search type");
        }
  
        let searchQuery: any;
        if (typeLower === "user") {
          searchQuery = {
            $or: [
              { name: regexQuery },
              { username: regexQuery },
              { email: regexQuery },
            ],
          };
        } else {
          searchQuery = { [modelInfo.searchField]: regexQuery };
        }
  
        const queryResults = await modelInfo.model
          .find(searchQuery)
          .select(typeLower === "user" ? "_id clerkId name username" : typeLower === "answer" ? "_id question content" : `_id ${modelInfo.searchField}`)
          .limit(8)
          .lean();
  
        results = queryResults.map((item: any) => {
          const resultType = typeLower;

          return {
            title:
              resultType === "answer"
                ? `Answers containing ${query}`
                : resultType === "user"
                ? (item.name || item.username)
                : item[modelInfo.searchField],
            type: resultType,
            id:
              resultType === "user"
                ? item.clerkId
                : resultType === "answer"
                ? item.question
                : item._id,
          };
        });
      }
      return JSON.stringify(results);
    } catch (error) {
      console.log(`Error fetching global results, ${error}`);
      throw error;
    }
  }