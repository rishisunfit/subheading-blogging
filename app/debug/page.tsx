/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { postsApi } from "@/services/posts";
import { templatesApi } from "@/services/templates";

export default function DebugPage() {
  const [posts, setPosts] = useState<unknown[]>([]);
  const [templates, setTemplates] = useState<unknown[]>([]);
  const [localStorageData, setLocalStorageData] = useState<{
    posts: string | null;
    templates: string | null;
  }>({ posts: null, templates: null });
  const [localStorageKeys, setLocalStorageKeys] = useState<
    Array<{ key: string; length: number }>
  >([]);
  const [isClient, setIsClient] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Load from APIs
      const postsData = await postsApi.getAll();
      const templatesData = await templatesApi.getAll();
      setPosts(postsData);
      setTemplates(templatesData);

      // Load raw localStorage (only on client)
      if (typeof window !== "undefined") {
        setLocalStorageData({
          posts: localStorage.getItem("blogish_posts"),
          templates: localStorage.getItem("blogish_templates"),
        });

        // Load all localStorage keys
        const keys = Object.keys(localStorage).map((key) => ({
          key,
          length: localStorage.getItem(key)?.length || 0,
        }));
        setLocalStorageKeys(keys);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setIsClient(true);
      loadData();
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearAll = () => {
    if (confirm("Are you sure you want to clear all data?")) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("blogish_posts");
        localStorage.removeItem("blogish_templates");
        loadData();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Debug: LocalStorage Data</h1>

        <div className="mb-6">
          <button
            onClick={clearAll}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Clear All Data
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Posts Section */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Posts (blogish_posts)</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Raw localStorage value:
              </p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                {localStorageData.posts || "null"}
              </pre>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Parsed posts ({posts.length}):
              </p>
              <div className="space-y-2">
                {posts.map((post: any) => (
                  <div key={post.id} className="bg-gray-50 p-3 rounded text-sm">
                    <div className="font-semibold">{post.title}</div>
                    <div className="text-xs text-gray-500">
                      ID: {post.id} | Created: {post.created_at}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Content: {post.content.substring(0, 50)}...
                    </div>
                  </div>
                ))}
                {posts.length === 0 && (
                  <p className="text-gray-400 text-sm">No posts found</p>
                )}
              </div>
            </div>
          </div>

          {/* Templates Section */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">
              Templates (blogish_templates)
            </h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Raw localStorage value:
              </p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                {localStorageData.templates || "null"}
              </pre>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Parsed templates ({templates.length}):
              </p>
              <div className="space-y-2">
                {templates.map((template: any) => (
                  <div
                    key={template.id}
                    className="bg-gray-50 p-3 rounded text-sm"
                  >
                    <div className="font-semibold">{template.name}</div>
                    <div className="text-xs text-gray-500">
                      ID: {template.id} | Created: {template.created_at}
                    </div>
                  </div>
                ))}
                {templates.length === 0 && (
                  <p className="text-gray-400 text-sm">No templates found</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* All localStorage keys */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">All localStorage Keys</h2>
          <div className="space-y-2">
            {isClient ? (
              localStorageKeys.length > 0 ? (
                localStorageKeys.map((item) => (
                  <div
                    key={item.key}
                    className="flex justify-between items-center"
                  >
                    <span className="font-mono text-sm">{item.key}</span>
                    <span className="text-xs text-gray-500">
                      {item.length} chars
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm">
                  No localStorage keys found
                </p>
              )
            ) : (
              <p className="text-gray-400 text-sm">Loading...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
