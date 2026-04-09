import { parsePartialJson } from "@langchain/core/output_parsers";
import {
  useStreamContext,
  type JsonResult,
  type TableResult,
} from "@/providers/Stream";
import { AIMessage, Checkpoint, Message } from "@langchain/langgraph-sdk";
import { getContentString } from "../utils";
import { BranchSwitcher, CommandBar } from "./shared";
import { MarkdownText } from "../markdown-text";
import { LoadExternalComponent } from "@langchain/langgraph-sdk/react-ui";
import { cn } from "@/lib/utils";
import { ToolCalls, ToolResult } from "./tool-calls";
import { MessageContentComplex } from "@langchain/core/messages";
import { Fragment } from "react/jsx-runtime";
import { isAgentInboxInterruptSchema } from "@/lib/agent-inbox-interrupt";
import { ThreadView } from "../agent-inbox";
import { useQueryState, parseAsBoolean } from "nuqs";
import { GenericInterruptView } from "./generic-interrupt";
import { useArtifact } from "../artifact";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

function TableResultCard({ result }: { result: TableResult }) {
  const [Artifact, artifact] = useArtifact();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const tableSummary =
    result.meta.total_rows > result.meta.preview_rows
      ? `已查询到 ${result.meta.total_rows} 条记录，以下展示前 ${result.meta.preview_rows} 行。`
      : `已查询到 ${result.meta.total_rows} 条记录。`;
  const primaryDownloadFormat = (
    result.download.formats[0] ?? "file"
  ).toUpperCase();
  const filteredRows = result.raw.rows.filter((row) => {
    if (!searchTerm.trim()) return true;
    const normalizedKeyword = searchTerm.trim().toLowerCase();
    return row.some((cell) => cell.toLowerCase().includes(normalizedKeyword));
  });
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filteredRows.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <>
      <div className="mt-4 flex max-w-4xl flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium text-slate-900">{result.title}</div>
          <div className="text-sm text-slate-500">{tableSummary}</div>
        </div>

        <div className="overflow-auto rounded-2xl border border-slate-200">
          <table className="min-w-[920px] border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr>
                {result.preview.columns.map((column) => (
                  <th
                    key={column}
                    className={cn(
                      "border-b border-slate-200 px-4 py-3 font-semibold whitespace-nowrap text-slate-700",
                      result.preview.columns.indexOf(column) >= 3
                        ? "text-right"
                        : "text-left",
                    )}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.preview.rows.map((row, rowIndex) => (
                <tr
                  key={`${row[0]}-${rowIndex}`}
                  className="odd:bg-white even:bg-slate-50/40"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${cell}-${cellIndex}`}
                      className={cn(
                        "border-b border-slate-100 px-4 py-3 whitespace-nowrap text-slate-700",
                        cellIndex >= 3 && "text-right font-medium text-slate-900",
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-3">
          <Button
            className="rounded-xl bg-slate-900 px-5 text-white shadow-sm transition hover:bg-slate-800"
            onClick={() => artifact.setOpen(true)}
          >
            查看完整数据
          </Button>
        </div>
      </div>

      <Artifact title={result.title}>
        <div className="absolute inset-0 flex min-w-[32vw] flex-col bg-white">
          <div className="grid grid-cols-[1fr_auto] items-start gap-4 border-b border-slate-200 px-5 py-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-medium tracking-[0.08em] text-rose-600 uppercase">
                  Preview
                </span>
                <span className="text-xs text-slate-400">结构化数据完整视图</span>
              </div>
              <h2 className="truncate text-lg font-semibold tracking-[0.01em] text-slate-900">
                {result.title}
              </h2>
            </div>
            <button
              onClick={() => artifact.setOpen(false)}
              className="cursor-pointer rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <XIcon className="size-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜索字段、筛选值或快速定位..."
              className="h-10 flex-1 rounded-xl border-slate-200 bg-slate-50 text-sm shadow-none"
            />
            <a
              href={result.download.data_url}
              download={result.download.filename}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm shadow-slate-100/70 transition hover:bg-slate-50"
            >
              下载 {primaryDownloadFormat}
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-2.5">
            <div className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 shadow-sm shadow-slate-100/70">
              <span className="text-[11px] tracking-[0.08em] text-slate-400">
                {searchTerm.trim() ? "筛选结果" : "总记录数"}
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {filteredRows.length}
              </span>
            </div>
            <div className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 shadow-sm shadow-slate-100/70">
              <span className="text-[11px] tracking-[0.08em] text-slate-400">
                当前页
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {currentPage}/{totalPages}
              </span>
            </div>
            <div className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 shadow-sm shadow-slate-100/70">
              <span className="text-[11px] tracking-[0.08em] text-slate-400">
                每页行数
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {pageSize}
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden px-5 py-3">
            <div className="h-full overflow-auto rounded-2xl border border-slate-200">
              <table className="min-w-[920px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    {result.raw.columns.map((column) => (
                      <th
                        key={column}
                        className={cn(
                          "border-b border-slate-200 px-4 py-3 font-semibold whitespace-nowrap text-slate-700",
                          result.raw.columns.indexOf(column) >= 3
                            ? "text-right"
                            : "text-left",
                        )}
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length ? (
                    pageRows.map((row, rowIndex) => (
                      <tr
                        key={`${row[0]}-${pageStart + rowIndex}`}
                        className="odd:bg-white even:bg-slate-50/40"
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            key={`${cell}-${cellIndex}`}
                            className={cn(
                              "border-b border-slate-100 px-4 py-3 whitespace-nowrap text-slate-700",
                              cellIndex >= 3 && "text-right font-medium text-slate-900",
                            )}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={result.raw.columns.length}
                        className="px-4 py-10 text-center text-sm text-slate-500"
                      >
                        未找到匹配的数据。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2.5">
            <div className="text-sm text-slate-500">
              显示第{" "}
              {filteredRows.length === 0 ? 0 : pageStart + 1}
              {" - "}
              {Math.min(pageStart + pageRows.length, filteredRows.length)} 条，共{" "}
              {filteredRows.length} 条
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-xl border-slate-200"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                className="rounded-xl border-slate-200"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
              >
                下一页
              </Button>
            </div>
          </div>
        </div>
      </Artifact>
    </>
  );
}

function JsonResultCard({ result }: { result: JsonResult }) {
  const [Artifact, artifact] = useArtifact();
  const primaryDownloadFormat = (
    result.download.formats[0] ?? "file"
  ).toUpperCase();
  const isArrayPreview = Array.isArray(result.preview.json);
  const previewEntries = isArrayPreview
    ? (result.preview.json as unknown[]).map((item, index) => [
        `[${index}]`,
        item,
      ] as const)
    : Object.entries(result.preview.json);

  return (
    <>
      <div className="mt-4 flex max-w-4xl flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium text-slate-900">{result.title}</div>
          <div className="text-sm text-slate-500">
            {result.meta.top_level_type === "array"
              ? `返回 ${result.meta.field_count} 条 JSON 记录，当前预览 ${result.meta.preview_count} 条。`
              : `返回 1 个 JSON 对象，包含 ${result.meta.field_count} 个顶层字段，当前预览 ${result.meta.preview_count} 个字段。`}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500">
              顶层类型 {result.meta.top_level_type}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500">
              {result.meta.top_level_type === "array"
                ? `总条数 ${result.meta.field_count}`
                : `顶层字段 ${result.meta.field_count}`}
            </span>
          </div>
          <div className="divide-y divide-slate-200">
            {previewEntries.map(([key, value]) => (
              <div
                key={key}
                className="grid grid-cols-[140px_1fr] gap-4 px-4 py-3 text-sm"
              >
                <div className="font-medium text-slate-700">{key}</div>
                <div className="min-w-0 text-slate-500">
                  {summarizeJsonValue(value)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            className="rounded-xl bg-slate-900 px-5 text-white shadow-sm transition hover:bg-slate-800"
            onClick={() => artifact.setOpen(true)}
          >
            查看完整数据
          </Button>
        </div>
      </div>

      <Artifact title={result.title}>
        <div className="absolute inset-0 flex min-w-[32vw] flex-col bg-white">
          <div className="grid grid-cols-[1fr_auto] items-start gap-4 border-b border-slate-200 px-5 py-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-medium tracking-[0.08em] text-rose-600 uppercase">
                  Preview
                </span>
                <span className="text-xs text-slate-400">结构化 JSON 完整视图</span>
              </div>
              <h2 className="truncate text-lg font-semibold tracking-[0.01em] text-slate-900">
                {result.title}
              </h2>
            </div>
            <button
              onClick={() => artifact.setOpen(false)}
              className="cursor-pointer rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <XIcon className="size-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
            <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
              {result.meta.top_level_type === "array"
                ? `顶层类型：${result.meta.top_level_type} · 总条数：${result.meta.field_count}`
                : `顶层类型：${result.meta.top_level_type} · 顶层字段：${result.meta.field_count}`}
            </div>
            <a
              href={result.download.data_url}
              download={result.download.filename}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm shadow-slate-100/70 transition hover:bg-slate-50"
            >
              下载 {primaryDownloadFormat}
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-2.5">
            <div className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 shadow-sm shadow-slate-100/70">
              <span className="text-[11px] tracking-[0.08em] text-slate-400">
                顶层类型
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {result.meta.top_level_type}
              </span>
            </div>
            <div className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 shadow-sm shadow-slate-100/70">
              <span className="text-[11px] tracking-[0.08em] text-slate-400">
                {result.meta.top_level_type === "array" ? "总条数" : "顶层字段"}
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {result.meta.field_count}
              </span>
            </div>
            <div className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 shadow-sm shadow-slate-100/70">
              <span className="text-[11px] tracking-[0.08em] text-slate-400">
                {result.meta.top_level_type === "array" ? "预览条数" : "预览字段"}
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {result.meta.preview_count}
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden px-5 py-3">
            <div className="h-full overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <JsonTreeNode
                label="root"
                value={result.raw.json}
                depth={0}
                defaultExpanded={true}
              />
            </div>
          </div>
        </div>
      </Artifact>
    </>
  );
}

function summarizeJsonValue(value: unknown) {
  if (Array.isArray(value)) {
    return `数组 · ${value.length} 项`;
  }

  if (value && typeof value === "object") {
    return `对象 · ${Object.keys(value as Record<string, unknown>).length} 个字段`;
  }

  if (typeof value === "string") {
    return value.length > 80 ? `${value.slice(0, 80)}...` : value;
  }

  return String(value);
}

function JsonTreeNode({
  label,
  value,
  depth,
  defaultExpanded = false,
}: {
  label: string;
  value: unknown;
  depth: number;
  defaultExpanded?: boolean;
}) {
  const isArray = Array.isArray(value);
  const isObject =
    value !== null && typeof value === "object" && !Array.isArray(value);
  const isBranch = isArray || isObject;
  const [expanded, setExpanded] = useState(defaultExpanded);
  const entries = isArray
    ? (value as unknown[]).map((item, index) => [`[${index}]`, item] as const)
    : isObject
      ? Object.entries(value as Record<string, unknown>)
      : [];

  return (
    <div>
      <div
        className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/80"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isBranch ? (
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            className="mt-0.5 cursor-pointer rounded p-0.5 text-slate-500 hover:bg-slate-200"
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="font-medium text-slate-700">{label}</span>
            {isArray && (
              <span className="text-xs text-slate-400">Array({entries.length})</span>
            )}
            {isObject && (
              <span className="text-xs text-slate-400">
                Object({entries.length})
              </span>
            )}
            {!isBranch && (
              <span className="min-w-0 break-all text-slate-500">
                {formatJsonLeaf(value)}
              </span>
            )}
          </div>
        </div>
      </div>

      {isBranch && expanded && (
        <div>
          {entries.map(([childLabel, childValue]) => (
            <JsonTreeNode
              key={`${label}-${childLabel}`}
              label={childLabel}
              value={childValue}
              depth={depth + 1}
              defaultExpanded={depth < 1 && childLabel !== "items"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatJsonLeaf(value: unknown) {
  if (typeof value === "string") {
    return `"${value}"`;
  }
  if (value === null) {
    return "null";
  }
  return String(value);
}

function CustomComponent({
  message,
  thread,
}: {
  message: Message;
  thread: ReturnType<typeof useStreamContext>;
}) {
  const artifact = useArtifact();
  const { values } = useStreamContext();
  const customComponents = values.ui?.filter(
    (ui) => ui.metadata?.message_id === message.id,
  );

  if (!customComponents?.length) return null;
  return (
    <Fragment key={message.id}>
      {customComponents.map((customComponent) => (
        <LoadExternalComponent
          key={customComponent.id}
          stream={thread}
          message={customComponent}
          meta={{ ui: customComponent, artifact }}
        />
      ))}
    </Fragment>
  );
}

function parseAnthropicStreamedToolCalls(
  content: MessageContentComplex[],
): AIMessage["tool_calls"] {
  const toolCallContents = content.filter((c) => c.type === "tool_use" && c.id);

  return toolCallContents.map((tc) => {
    const toolCall = tc as Record<string, any>;
    let json: Record<string, any> = {};
    if (toolCall?.input) {
      try {
        json = parsePartialJson(toolCall.input) ?? {};
      } catch {
        // Pass
      }
    }
    return {
      name: toolCall.name ?? "",
      id: toolCall.id ?? "",
      args: json,
      type: "tool_call",
    };
  });
}

interface InterruptProps {
  interrupt?: unknown;
  isLastMessage: boolean;
  hasNoAIOrToolMessages: boolean;
}

function Interrupt({
  interrupt,
  isLastMessage,
  hasNoAIOrToolMessages,
}: InterruptProps) {
  const fallbackValue = Array.isArray(interrupt)
    ? (interrupt as Record<string, any>[])
    : (((interrupt as { value?: unknown } | undefined)?.value ??
        interrupt) as Record<string, any>);

  return (
    <>
      {isAgentInboxInterruptSchema(interrupt) &&
        (isLastMessage || hasNoAIOrToolMessages) && (
          <ThreadView interrupt={interrupt} />
        )}
      {interrupt &&
      !isAgentInboxInterruptSchema(interrupt) &&
      (isLastMessage || hasNoAIOrToolMessages) ? (
        <GenericInterruptView interrupt={fallbackValue} />
      ) : null}
    </>
  );
}

export function AssistantMessage({
  message,
  isLoading,
  handleRegenerate,
}: {
  message: Message | undefined;
  isLoading: boolean;
  handleRegenerate: (parentCheckpoint: Checkpoint | null | undefined) => void;
}) {
  const content = message?.content ?? [];
  const contentString = getContentString(content);
  const [hideToolCalls] = useQueryState(
    "hideToolCalls",
    parseAsBoolean.withDefault(false),
  );

  const thread = useStreamContext();
  const isLastMessage =
    thread.messages[thread.messages.length - 1].id === message?.id;
  const hasNoAIOrToolMessages = !thread.messages.find(
    (m) => m.type === "ai" || m.type === "tool",
  );
  const meta = message ? thread.getMessagesMetadata(message) : undefined;
  const threadInterrupt = thread.interrupt;
  const result = thread.values.results?.find((item) => item.message_id === message?.id);

  const parentCheckpoint = meta?.firstSeenState?.parent_checkpoint;
  const anthropicStreamedToolCalls = Array.isArray(content)
    ? parseAnthropicStreamedToolCalls(content)
    : undefined;

  const hasToolCalls =
    message &&
    "tool_calls" in message &&
    message.tool_calls &&
    message.tool_calls.length > 0;
  const toolCallsHaveContents =
    hasToolCalls &&
    message.tool_calls?.some(
      (tc) => tc.args && Object.keys(tc.args).length > 0,
    );
  const hasAnthropicToolCalls = !!anthropicStreamedToolCalls?.length;
  const isToolResult = message?.type === "tool";

  if (isToolResult && hideToolCalls) {
    return null;
  }

  return (
    <div className="group mr-auto flex w-full items-start gap-2">
      <div className="flex w-full flex-col gap-2">
        {isToolResult ? (
          <>
            <ToolResult message={message} />
            <Interrupt
              interrupt={threadInterrupt}
              isLastMessage={isLastMessage}
              hasNoAIOrToolMessages={hasNoAIOrToolMessages}
            />
          </>
        ) : (
          <>
            {contentString.length > 0 && (
              <div className="py-1">
                <MarkdownText>{contentString}</MarkdownText>
                {result?.type === "table" && <TableResultCard result={result} />}
                {result?.type === "json" && <JsonResultCard result={result} />}
              </div>
            )}

            {!hideToolCalls && (
              <>
                {(hasToolCalls && toolCallsHaveContents && (
                  <ToolCalls toolCalls={message.tool_calls} />
                )) ||
                  (hasAnthropicToolCalls && (
                    <ToolCalls toolCalls={anthropicStreamedToolCalls} />
                  )) ||
                  (hasToolCalls && (
                    <ToolCalls toolCalls={message.tool_calls} />
                  ))}
              </>
            )}

            {message && (
              <CustomComponent
                message={message}
                thread={thread}
              />
            )}
            <Interrupt
              interrupt={threadInterrupt}
              isLastMessage={isLastMessage}
              hasNoAIOrToolMessages={hasNoAIOrToolMessages}
            />
            <div
              className={cn(
                "mr-auto flex items-center gap-2 transition-opacity",
                "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100",
              )}
            >
              <BranchSwitcher
                branch={meta?.branch}
                branchOptions={meta?.branchOptions}
                onSelect={(branch) => thread.setBranch(branch)}
                isLoading={isLoading}
              />
              <CommandBar
                content={contentString}
                isLoading={isLoading}
                isAiMessage={true}
                handleRegenerate={() => handleRegenerate(parentCheckpoint)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function AssistantMessageLoading() {
  return (
    <div className="mr-auto flex items-start gap-2">
      <div className="bg-muted flex h-8 items-center gap-1 rounded-2xl px-4 py-2">
        <div className="bg-foreground/50 h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full"></div>
        <div className="bg-foreground/50 h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_0.5s_infinite] rounded-full"></div>
        <div className="bg-foreground/50 h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_1s_infinite] rounded-full"></div>
      </div>
    </div>
  );
}
