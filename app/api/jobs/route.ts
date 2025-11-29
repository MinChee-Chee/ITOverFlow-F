import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "Node.js developer in New-York, USA";
    const page = searchParams.get("page") || "1";
    const numPages = searchParams.get("num_pages") || "1";
    const datePosted = searchParams.get("date_posted") || "all";

    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=${page}&num_pages=${numPages}&date_posted=${datePosted}`;
    
    const options = {
      method: "GET",
      headers: {
        "x-rapidapi-key": process.env.RAPIDAPI_KEY || "f9dd055560msh19f8a0462b834dep16e693jsn04e287ec0c64",
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
    };

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`RapidAPI error: ${response.status}`);
    }
    
    const result = await response.json();
    const jobs = result.data || [];

    return NextResponse.json(
      { jobs },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Error fetching jobs:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch jobs";
    return NextResponse.json(
      {
        error: message,
        jobs: [],
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

