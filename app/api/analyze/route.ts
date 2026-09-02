import { NextResponse } from "next/server";
import { runAnalysis } from "@/lib/analysis";
import { isValidGitHubUrl } from "@/lib/github";
import type { AnalyzeRequest } from "@/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  let body: AnalyzeRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.repositoryUrl) {
    return NextResponse.json(
      { error: "repositoryUrl is required" },
      { status: 400 }
    );
  }

  if (!isValidGitHubUrl(body.repositoryUrl)) {
    return NextResponse.json(
      { error: "Invalid GitHub repository URL" },
      { status: 400 }
    );
  }

  const result = await runAnalysis(body);

  if (result.status === "failed") {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json(result, { status: 200 });
}
