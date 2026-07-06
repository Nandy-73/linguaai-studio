import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl font-semibold">API Documentation</h1>
      <p className="mt-3 text-muted-foreground">
        Everything the UI does is available over REST. Full interactive reference lives
        at <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">/api/v1/docs</code> (OpenAPI).
      </p>

      <Card className="mt-10">
        <CardHeader><CardTitle>Quickstart — dub a video</CardTitle></CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-foreground p-4 font-mono text-xs leading-relaxed text-background">
{`# 1. Create an API key in Developers → API Keys, then:
export LAI_KEY="lai_..."

# 2. Request an upload slot
curl -X POST /api/v1/projects/{project_id}/assets \\
  -H "Authorization: Bearer $LAI_KEY" \\
  -d '{"filename":"talk.mp4","content_type":"video/mp4","size_bytes":1048576,"kind":"video"}'

# 3. PUT the file to upload_url, then confirm
curl -X POST /api/v1/projects/{project_id}/assets/{asset_id}/confirm \\
  -H "Authorization: Bearer $LAI_KEY"

# 4. Start a dubbing run — Tamil (spoken) + French
curl -X POST /api/v1/projects/{project_id}/runs \\
  -H "Authorization: Bearer $LAI_KEY" \\
  -d '{"asset_id":"...","template":"video_dubbing",
       "target_languages":["ta","fr"],"styles":{"ta":"spoken"}}'

# 5. Watch progress (WebSocket) or poll
curl /api/v1/runs/{run_id} -H "Authorization: Bearer $LAI_KEY"

# 6. Download artifacts
curl /api/v1/runs/{run_id}/artifacts -H "Authorization: Bearer $LAI_KEY"`}
          </pre>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle>Concepts</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Projects</strong> hold assets, characters and language defaults inside an organization.</p>
          <p><strong className="text-foreground">Runs</strong> are pipeline executions: a template (video_dubbing, audio_dubbing, subtitles, document) expanded into stages you can watch complete in real time.</p>
          <p><strong className="text-foreground">Styles</strong> are native language varieties — pass <code className="font-mono">"auto"</code> and the engine selects the most natural one, or pin e.g. <code className="font-mono">"tanglish"</code>.</p>
          <p><strong className="text-foreground">Artifacts</strong> are stage outputs: transcripts, subtitle files, dubbed tracks, final renders — all downloadable via presigned URLs.</p>
        </CardContent>
      </Card>
    </div>
  );
}
