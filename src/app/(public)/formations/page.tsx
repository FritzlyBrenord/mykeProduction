// app/page.tsx ou n'importe quelle page
"use client";

import RichTextEditor from "@/components/RichTextEditorr";
import { useState } from "react";

export default function Home() {
  const [content, setContent] = useState("");

  return (
    <main className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Éditeur d'Articles
      </h1>

      <RichTextEditor
        content={content}
        onChange={setContent}
        placeholder="Commencez votre article ici..."
      />

      <div className="mt-8 p-4 bg-white rounded-lg">
        <h2 className="font-bold mb-2">HTML Généré :</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
          {content}
        </pre>
      </div>
    </main>
  );
}
