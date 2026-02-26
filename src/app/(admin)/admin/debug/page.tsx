"use client";

import { useEffect, useState } from "react";

export default function AdminDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [formations, setFormations] = useState<any[]>([]);
  const [bucketTest, setBucketTest] = useState<any>(null);

  useEffect(() => {
    async function debug() {
      try {
        // Test API call
        const res = await fetch("/api/admin/formations");
        const json = await res.json();
        console.log("API Response:", { status: res.status, data: json });

        setApiResponse({
          status: res.status,
          statusText: res.statusText,
          data: json,
        });

        if (Array.isArray(json)) {
          setFormations(json);
        }

        setDebugInfo({
          timestamp: new Date().toISOString(),
          pathname: window.location.pathname,
          cookies: document.cookie,
        });

        // Test bucket access
        const bucketRes = await fetch("/api/admin/test-bucket");
        const bucketJson = await bucketRes.json();
        setBucketTest(bucketJson);
      } catch (error) {
        console.error("Debug error:", error);
        setDebugInfo({ error: String(error) });
      }
    }

    debug();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Admin Debug - Thumbnails</h1>

      <div className="bg-slate-100 p-4 rounded">
        <h2 className="font-bold mb-2">API Response Status:</h2>
        <pre className="text-xs">
          {JSON.stringify(apiResponse?.status, null, 2)}
        </pre>
      </div>

      {bucketTest && (
        <div className="bg-orange-50 border-2 border-orange-300 p-4 rounded">
          <h2 className="text-2xl font-bold text-orange-900 mb-4">
            🪣 Storage Bucket Test
          </h2>

          <div className="space-y-4">
            <div>
              <p className="font-bold text-orange-900">Buckets Available:</p>
              {bucketTest.buckets?.list ? (
                <ul className="text-xs">
                  {bucketTest.buckets.list.map((b: any) => (
                    <li key={b.id}>
                      - <code className="bg-white px-2 py-1">{b.name}</code>
                      {b.public ? " ✅ PUBLIC" : " 🔒 PRIVATE"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-red-600">
                  ❌ {bucketTest.buckets?.error || "Could not list buckets"}
                </p>
              )}
            </div>

            <div>
              <p className="font-bold text-orange-900">
                Images in formations/ folder:
              </p>
              {bucketTest.formationImages?.files?.length > 0 ? (
                <ul className="text-xs">
                  {bucketTest.formationImages.files.map((f: any) => (
                    <li key={f.id}>
                      ✅ {f.name} ({(f.metadata?.size || 0) / 1024}KB)
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-red-600">
                  ❌{" "}
                  {bucketTest.formationImages?.error ||
                    "No files found or error"}
                </p>
              )}
            </div>

            <div>
              <p className="font-bold text-orange-900">Public URL Test:</p>
              <p className="text-xs">{bucketTest.publicUrlTest?.url}</p>
            </div>

            <div className="bg-yellow-50 p-3 rounded border border-yellow-300">
              <p className="font-bold text-sm">⚠️ To fix image display:</p>
              <ol className="text-xs list-decimal list-inside mt-2">
                {bucketTest.hints?.map((hint: string, i: number) => (
                  <li key={i} className="my-1">
                    {hint}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-4">
          Formations ({formations.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formations.map((formation: any, i) => (
            <div
              key={formation.id}
              className="border-2 border-gray-300 p-4 rounded-lg bg-white"
            >
              <div className="mb-3">
                <p className="text-sm text-gray-600">
                  <strong>ID:</strong> {formation.id}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Title:</strong> {formation.title}
                </p>
              </div>

              <div className="mb-3">
                <p className="text-sm font-bold text-gray-800">
                  Thumbnail URL:
                </p>
                {formation.thumbnail_url ? (
                  <div>
                    <p className="text-xs text-blue-600 break-all bg-gray-100 p-2 rounded">
                      {formation.thumbnail_url}
                    </p>
                    <div className="mt-2 border border-gray-300 rounded overflow-hidden bg-gray-50">
                      <img
                        src={formation.thumbnail_url}
                        alt={formation.title}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          const errorDiv = document.createElement("div");
                          errorDiv.textContent = "❌ Image failed to load";
                          errorDiv.style.padding = "10px";
                          errorDiv.style.color = "red";
                          (
                            e.target as HTMLImageElement
                          ).parentElement?.appendChild(errorDiv);
                        }}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-red-600">
                    ❌ No thumbnail_url field
                  </p>
                )}
              </div>

              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <p>
                  <strong>Format:</strong> {formation.format}
                </p>
                <p>
                  <strong>Status:</strong> {formation.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <details className="bg-slate-100 p-4 rounded">
        <summary className="font-bold cursor-pointer">
          Full API Response (JSON)
        </summary>
        <pre className="text-xs mt-4 overflow-auto max-h-96">
          {JSON.stringify(apiResponse, null, 2)}
        </pre>
      </details>
    </div>
  );
}
