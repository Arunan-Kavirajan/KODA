import { NextRequest, NextResponse } from "next/server";
import { getAnalysisJob, getSnapshot } from "@/lib/analysis/jobs";
import { ArchitectAgent } from "@/lib/agents/architect";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    
    const job = getAnalysisJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const snapshot = getSnapshot(jobId);
    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot not found or analysis not complete" }, { status: 400 });
    }

    // Update state
    job.status = "architect-analyzing";
    job.updatedAt = new Date().toISOString();

    const architect = new ArchitectAgent();
    const result = await architect.analyze({ snapshot });

    // Store result
    if (!job.agentResults) {
      job.agentResults = [];
    }
    
    // Remove previous architect results if retrying
    job.agentResults = job.agentResults.filter(r => r.agent !== architect.name);
    job.agentResults.push(result);
    
    job.status = result.status === "success" ? "architect-ready" : "complete"; // Or leave as complete on failure to not break UI
    // The instructions say: "If the Architect Agent fails: ... user receives a clear AI failure state"
    // So maybe we leave it as architect-ready or just rely on agentResults.status
    if (result.status === "error") {
      // Revert to complete, but UI can see the error in agentResults
      job.status = "complete"; 
    } else {
      job.status = "architect-ready";
    }
    
    job.updatedAt = new Date().toISOString();

    if (result.status === "error") {
      return NextResponse.json({ error: result.metadata?.error || "Unknown error" }, { status: 500 });
    }

    return NextResponse.json(result.findings);

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
